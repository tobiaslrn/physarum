import { COLOR_PALETTES, ColorPaletteManager } from "./palette";
import {
  MultiPopulationConfig,
  createMultiPopulationConfig,
} from "./population_config";
import { SimulationManager } from "./simulation";
import { UIManager } from "./ui";
import { WebGPUManager } from "./webgpu";

export class PhysarumApplication {
  private webgpuContext: any;
  private config: MultiPopulationConfig;
  private simulationManager: SimulationManager | null = null;
  private colorManager: ColorPaletteManager;
  private uiManager: UIManager;
  private resizeObserver: ResizeObserver | null = null;

  constructor(webgpuContext: WebGPUManager) {
    this.webgpuContext = webgpuContext;

    this.config = createMultiPopulationConfig(
      50_000,
      3,
      this.webgpuContext.canvas.width,
      this.webgpuContext.canvas.height
    );
    this.colorManager = new ColorPaletteManager();

    this.uiManager = new UIManager(
      this.config.particleCount,
      this.config.populations.length,
      "empty",

      () => this.onResetParticles(),
      () => this.onRegenerateConfig(),
      (newCount: number) => this.onPopulationCountChange(newCount),
      (newCount: number) => this.onParticleCountChange(newCount),
      (paletteName: string) => this.onPaletteChange(paletteName),
      () => this.onColorChange()
    );

    this.onPaletteChange(COLOR_PALETTES[0].name);
  }

  async initialize(): Promise<boolean> {
    this.resizeObserver = WebGPUManager.setupCanvasResizeObserver(
      this.webgpuContext.canvas,
      (width: number, height: number) => this.onCanvasResize(width, height)
    );
    this.simulationManager = SimulationManager.create(
      this.webgpuContext.device,
      this.config
    );
    this.simulationManager.reset();
    this.uiManager.setupPopulationControls(this.config, this.colorManager);
    return true;
  }

  private initializeSimulationWithConfig(): void {
    this.simulationManager = SimulationManager.create(
      this.webgpuContext.device,
      this.config
    );
  }

  private regenerateConfig(): void {
    try {
      this.config = createMultiPopulationConfig(
        this.config.particleCount,
        this.config.populations.length,
        this.config.width,
        this.config.height
      );

      this.initializeSimulationWithConfig();
      this.uiManager.setupPopulationControls(this.config, this.colorManager);
      this.simulationManager!.reset();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  private handleSimulationError(error: any): void {
    console.error("Failed to create simulation:", error);

    if (
      error instanceof Error &&
      error.message.includes("exceeds device limit")
    ) {
      const params = this.uiManager.getParams();
      const newParticleCount = Math.min(this.config.particleCount / 2, 1000000);
      console.log(
        `Reduced particle count to ${newParticleCount.toLocaleString()} and retrying...`
      );

      try {
        this.initializeSimulationWithConfig();

        this.uiManager.setupPopulationControls(this.config, this.colorManager);
        this.simulationManager!.reset();

        params.particleCount = newParticleCount;
        this.uiManager.refresh();
      } catch (retryError) {
        alert(
          "Cannot create simulation with current settings. Try reducing the particle count."
        );
      }
    } else {
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private onResetParticles(): void {
    try {
      this.simulationManager!.reset();
      this.uiManager.refresh();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  private onRegenerateConfig(): void {
    try {
      this.regenerateConfig();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  private onPopulationCountChange(newCount: number): void {
    try {
      this.config = createMultiPopulationConfig(
        this.config.particleCount,
        newCount,
        this.config.width,
        this.config.height
      );

      this.initializeSimulationWithConfig();
      this.uiManager.setupPopulationControls(this.config, this.colorManager);
      this.simulationManager!.reset();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  private onParticleCountChange(newCount: number): void {
    try {
      this.config.particleCount = newCount;
      this.initializeSimulationWithConfig();
      this.simulationManager!.reset();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  private onPaletteChange(paletteName: string): void {
    this.colorManager.updateColorsFromPaletteName(paletteName);
    this.uiManager.updateColorsFromPalette(this.colorManager);
    this.uiManager.setupPopulationControls(this.config, this.colorManager);
  }

  private onColorChange(): void {
    const currentColors = this.uiManager.getCurrentColors();
    this.colorManager.updateIndividualColor(0, currentColors[0]);
    this.colorManager.updateIndividualColor(1, currentColors[1]);
    this.colorManager.updateIndividualColor(2, currentColors[2]);
    this.colorManager.updateIndividualColor(3, currentColors[3]);
    this.colorManager.updateIndividualColor(4, currentColors[4]);

    this.uiManager.setupPopulationControls(this.config, this.colorManager);
  }

  private onCanvasResize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;

    try {
      this.initializeSimulationWithConfig();
      this.simulationManager!.reset();
    } catch (error) {
      this.handleSimulationError(error);
    }
  }

  startSimulationLoop(): void {
    const animate = () => {
      if (this.webgpuContext && this.simulationManager?.getSimulation()) {
        this.simulationManager.runSimulationStep();
        this.simulationManager.render(
          this.webgpuContext.context,
          this.colorManager
        );
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
