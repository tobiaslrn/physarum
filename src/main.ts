import "./style.css";
import { WebGPUManager } from "./webgpu";
import { PhysarumApplication } from "./app";

// Initialize and start the application
(async () => {
  // Initialize WebGPU first
  const webgpuContext = await WebGPUManager.initialize();
  if (!webgpuContext) {
    console.error("Failed to initialize WebGPU");
    return;
  }

  // Create the application with the WebGPU context
  const app = new PhysarumApplication(webgpuContext);

  try {
    if (await app.initialize()) {
      app.startSimulationLoop();
    } else {
      console.error("Failed to initialize application");
    }
  } catch (error) {
    console.error("Error initializing application:", error);
  }
})();
