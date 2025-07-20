export interface WebGPUContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;
}

export class WebGPUManager {
  static async initialize(): Promise<WebGPUContext | null> {
    if (navigator.gpu === undefined) {
      this.showError("WebGPU is not supported in this browser.");
      return null;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) {
      this.showError(
        "No WebGPU adapter is available. WebGPU may not be enabled in your browser."
      );
      return null;
    }

    // Request device with higher storage buffer limits for very high particle counts
    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        maxBufferSize: adapter.limits.maxBufferSize,
      },
    });

    const canvas = document.querySelector<HTMLCanvasElement>("#webgpu-canvas");

    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;

    const context = canvas.getContext("webgpu") as GPUCanvasContext;

    const canvasFormat = "bgra8unorm";
    context.configure({
      device: device,
      format: canvasFormat,
      alphaMode: "opaque",
    });

    return { device, context, canvas };
  }

  static setupCanvasResizeObserver(
    canvas: HTMLCanvasElement,
    onResize: (width: number, height: number) => void
  ): ResizeObserver {
    let resizeTimeout: number | null = null;

    const observer = new ResizeObserver(() => {
      const newWidth = canvas.clientWidth;
      const newHeight = canvas.clientHeight;

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Debounce resize to avoid recreation too often
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        onResize(newWidth, newHeight);
      }, 300);
    });

    observer.observe(canvas);
    return observer;
  }

  private static showError(message: string): void {
    const errorDiv = document.querySelector("#error-message") as HTMLElement;
    const errorText = document.querySelector("#error-text") as HTMLElement;
    const canvas = document.querySelector("#webgpu-canvas") as HTMLElement;

    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.style.display = "block";
    }

    if (canvas) {
      canvas.style.display = "none";
    }

    console.error("WebGPU Error:", message);
  }
}
