import { Pane } from "tweakpane";
import { MultiPopulationConfig } from "./population_config";
import { COLOR_PALETTES, ColorPaletteManager } from "./palette";

export interface UIParams {
  numPopulations: number;
  particleCount: number;
  selectedPalette: string;
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  resetSimulation: () => void;
  regenerateConfig: () => void;
  onPopulationCountChange: (newCount: number) => void;
  onParticleCountChange: (newCount: number) => void;
  onPaletteChange: (paletteName: string) => void;
  onColorChange: () => void;
}

export class UIManager {
  private pane: Pane;
  private populationFolders: any[] = [];
  private params: UIParams;

  constructor(
    particleCount: number,
    numPopulations: number,
    selectedPalette: string,
    onResetSimulation: () => void,
    onRegenerateConfig: () => void,
    onPopulationCountChange: (newCount: number) => void,
    onParticleCountChange: (newCount: number) => void,
    onPaletteChange: (paletteName: string) => void,
    onColorChange: () => void
  ) {
    this.params = {
      numPopulations,
      particleCount,
      selectedPalette,
      color0: "#FFFFFF",
      color1: "#FFFFFF",
      color2: "#FFFFFF",
      color3: "#FFFFFF",
      color4: "#FFFFFF",
      resetSimulation: onResetSimulation,
      regenerateConfig: onRegenerateConfig,
      onPopulationCountChange: onPopulationCountChange,
      onParticleCountChange: onParticleCountChange,
      onPaletteChange: onPaletteChange,
      onColorChange: onColorChange,
    };

    this.pane = new Pane({
      title: "Physarum",
      expanded: true,
    });

    this.setupUI();
  }

  private setupUI(): void {
    this.setupGlobalControls();
    this.setupColorControls();
  }

  private setupGlobalControls(): void {
    const globalFolder = this.pane.addFolder({
      title: "Global Settings",
      expanded: true,
    });
    globalFolder
      .addInput(this.params, "numPopulations", { min: 1, max: 5, step: 1 })
      .on("change", (ev) => {
        this.params.onPopulationCountChange(ev.value);
      });
    globalFolder
      .addInput(this.params, "particleCount", {
        min: 10_000,
        max: 20_000_000,
        step: 100_000,
      })
      .on("change", (ev) => {
        this.params.onParticleCountChange(ev.value);
      });
    globalFolder
      .addButton({ title: "Reset Particles" })
      .on("click", this.params.resetSimulation);
    globalFolder
      .addButton({ title: "New Random Config" })
      .on("click", this.params.regenerateConfig);

    const githubButton = globalFolder
      .addButton({ title: "GitHub" })
      .on("click", () => {
        window.open("https://github.com/tobiaslrn/physarum", "_blank");
      });

    const buttonElement = githubButton.element.querySelector(
      ".tp-btnv_b"
    ) as HTMLElement;
    if (buttonElement) {
      buttonElement.innerHTML = `
        GitHub
      `;
      buttonElement.style.display = "flex";
      buttonElement.style.alignItems = "center";
      buttonElement.style.justifyContent = "center";
    }
  }

  private setupColorControls(): void {
    const colorFolder = this.pane.addFolder({
      title: "Color Palette",
      expanded: true,
    });

    const paletteOptions = COLOR_PALETTES.reduce((acc, palette) => {
      acc[palette.name] = palette.name;
      return acc;
    }, {} as Record<string, string>);

    colorFolder
      .addInput(this.params, "selectedPalette", {
        label: "Preset Palette",
        options: paletteOptions,
      })
      .on("change", (ev) => {
        this.params.onPaletteChange(ev.value);
      });

    colorFolder
      .addInput(this.params, "color0", {
        label: "Color 1",
        view: "color",
      })
      .on("change", () => {
        this.params.onColorChange();
      });

    colorFolder
      .addInput(this.params, "color1", {
        label: "Color 2",
        view: "color",
      })
      .on("change", () => {
        this.params.onColorChange();
      });

    colorFolder
      .addInput(this.params, "color2", {
        label: "Color 3",
        view: "color",
      })
      .on("change", () => {
        this.params.onColorChange();
      });

    colorFolder
      .addInput(this.params, "color3", {
        label: "Color 4",
        view: "color",
      })
      .on("change", () => {
        this.params.onColorChange();
      });

    colorFolder
      .addInput(this.params, "color4", {
        label: "Color 5",
        view: "color",
      })
      .on("change", () => {
        this.params.onColorChange();
      });
  }

  setupPopulationControls(
    config: MultiPopulationConfig,
    colorManager: ColorPaletteManager
  ): void {
    this.populationFolders.forEach((folder) => this.pane.remove(folder));
    this.populationFolders = [];

    const currentColors = colorManager.getCurrentColors();

    // controls for each population
    for (let i = 0; i < config.populations.length; i++) {
      const popFolder = this.pane.addFolder({
        title: `Population ${i + 1}`,
        expanded: false,
      });

      const folderElement = popFolder.element.querySelector(
        ".tp-fldv_t"
      ) as HTMLElement;
      if (folderElement) {
        const colorIndex = i % currentColors.length;
        const color = currentColors[colorIndex];
        folderElement.style.borderLeft = `4px solid ${color}`;
        folderElement.style.paddingLeft = "8px";

        // Add a colored dot indicator
        const colorDot = document.createElement("span");
        colorDot.className = "population-indicator";
        colorDot.style.backgroundColor = color;
        folderElement.querySelector(".tp-fldv_m")?.prepend(colorDot);
      }

      const pop = config.populations[i];

      popFolder.addInput(pop, "sensor_distance", {
        min: 1,
        max: 50,
        step: 0.5,
        label: "Sensor Distance",
      });

      popFolder.addInput(pop, "step_distance", {
        min: 0.1,
        max: 3,
        step: 0.1,
        label: "Step Distance",
      });

      popFolder.addInput(pop, "sensor_angle", {
        min: 0,
        max: Math.PI,
        step: 0.05,
        label: "Sensor Angle",
      });

      popFolder.addInput(pop, "rotation_angle", {
        min: 0,
        max: Math.PI,
        step: 0.05,
        label: "Rotation Angle",
      });

      popFolder.addInput(pop, "decay_factor", {
        min: 0.1,
        max: 1.0,
        step: 0.01,
        label: "Decay Factor",
      });

      popFolder.addInput(pop, "deposition_amount", {
        min: 1,
        max: 20,
        step: 0.5,
        label: "Deposition Amount",
      });

      const attractionFolder = popFolder.addFolder({
        title: "Attraction/Repulsion",
        expanded: false,
      });

      for (let j = 0; j < config.populations.length; j++) {
        const label = j === i ? `Self (Pop ${i + 1})` : `→ Pop ${j + 1}`;
        attractionFolder.addInput(config.attraction_table[i], j as any, {
          min: -2,
          max: 2,
          step: 0.1,
          label: label,
        });
      }

      this.populationFolders.push(popFolder);
    }
  }

  getParams(): UIParams {
    return this.params;
  }

  getCurrentColors(): string[] {
    return [
      this.params.color0,
      this.params.color1,
      this.params.color2,
      this.params.color3,
      this.params.color4,
    ];
  }

  updateColorsFromPalette(colorManager: ColorPaletteManager): void {
    const colors = colorManager.getCurrentColors();
    this.params.color0 = colors[0] || "#FF0000";
    this.params.color1 = colors[1] || "#00FF00";
    this.params.color2 = colors[2] || "#0000FF";
    this.params.color3 = colors[3] || "#FFFF00";
    this.params.color4 = colors[4] || "#FF00FF";
    this.pane.refresh();
  }

  refresh(): void {
    this.pane.refresh();
  }
}
