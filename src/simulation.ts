import { MultiPopulationConfig } from "./population_config";
import physarumShader from "./shaders/physarum.comp.wgsl";
import combineShader from "./shaders/combine.comp.wgsl";
import diffuseShader from "./shaders/diffuse.comp.wgsl";
import renderShaderFrag from "./shaders/render.frag.wgsl";
import renderShaderVertex from "./shaders/render.vertex.wgsl";
import { ColorPaletteManager } from "./palette";

export interface CreateSimulationPipeline {
  device: GPUDevice;
  config: MultiPopulationConfig;

  particleBuffer: GPUBuffer;
  trailMapsBuffer: GPUBuffer;
  combinedMapsBuffer: GPUBuffer;
  simulationConfigBuffer: GPUBuffer;
  populationConfigsBuffer: GPUBuffer;
  attractionTableBuffer: GPUBuffer;

  physarumPipeline: GPUComputePipeline;
  combinePipeline: GPUComputePipeline;
  diffusePipeline: GPUComputePipeline;
  renderPipeline: GPURenderPipeline;

  physarumBindGroup: GPUBindGroup;
  combineBindGroup: GPUBindGroup;
  diffuseBindGroup: GPUBindGroup;
}

export class SimulationManager {
  private simulation: CreateSimulationPipeline;
  private particleCount: number;
  private particlesPerPopulation: number;

  private constructor(device: GPUDevice, config: MultiPopulationConfig) {
    this.particleCount = config.particleCount;
    this.particlesPerPopulation = Math.floor(
      config.particleCount / config.populations.length
    );
    this.simulation = this.createSimulationPipeline(device, config);
  }

  public static create(
    device: GPUDevice,
    config: MultiPopulationConfig
  ): SimulationManager {
    return new SimulationManager(device, config);
  }

  public setParticleCount(newCount: number): void {
    this.validateParticleCount(newCount);
    this.particleCount = newCount;
    this.updateParticlesPerPopulation();
  }

  public updateParticleCount(newCount: number): void {
    this.setParticleCount(newCount);
    this.recreateParticleBuffer();
    this.initializeParticles(this.simulation, this.simulation.config);
  }

  private validateParticleCount(count: number): void {
    if (count <= 0) {
      throw new Error("Particle count must be greater than 0");
    }
  }

  private updateParticlesPerPopulation(): void {
    this.particlesPerPopulation = Math.floor(
      this.particleCount / this.simulation.config.populations.length
    );
  }

  private recreateParticleBuffer(): void {
    const device = this.simulation.device;
    const particleBufferSize = Math.max(this.particleCount * 16, 16); // 4 floats per particle

    if (particleBufferSize > device.limits.maxStorageBufferBindingSize) {
      throw new Error(
        `Particle buffer size (${(particleBufferSize / 1024 / 1024).toFixed(
          1
        )} MB) exceeds device limit (${(
          device.limits.maxStorageBufferBindingSize /
          1024 /
          1024
        ).toFixed(1)} MB). Try reducing particle count.`
      );
    }

    // Destroy old buffer and create new one
    this.simulation.particleBuffer.destroy();
    this.simulation.particleBuffer = device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Recreate bind groups that use the particle buffer
    this.recreatePhysarumBindGroup();
  }

  private recreatePhysarumBindGroup(): void {
    this.simulation.physarumBindGroup = this.simulation.device.createBindGroup({
      layout: this.simulation.physarumPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.simulation.particleBuffer } },
        { binding: 1, resource: { buffer: this.simulation.trailMapsBuffer } },
        {
          binding: 2,
          resource: { buffer: this.simulation.combinedMapsBuffer },
        },
        {
          binding: 3,
          resource: { buffer: this.simulation.simulationConfigBuffer },
        },
        {
          binding: 4,
          resource: { buffer: this.simulation.populationConfigsBuffer },
        },
      ],
    });
  }

  private createSimulationPipeline(
    device: GPUDevice,
    config: MultiPopulationConfig
  ): CreateSimulationPipeline {
    this.particlesPerPopulation = Math.floor(
      this.particleCount / config.populations.length
    );

    // Calculate buffer sizes and validate against device limits
    const mapSize = config.width * config.height;
    const totalMapSize = mapSize * config.populations.length;
    const trailMapBufferSize = totalMapSize * 4; // 1 float per pixel per population
    const particleBufferSize = Math.max(this.particleCount * 16, 16); // 4 floats per particle

    if (trailMapBufferSize > device.limits.maxStorageBufferBindingSize) {
      throw new Error(
        `Trail map buffer size (${(trailMapBufferSize / 1024 / 1024).toFixed(
          1
        )} MB) exceeds device limit (${(
          device.limits.maxStorageBufferBindingSize /
          1024 /
          1024
        ).toFixed(1)} MB). Try reducing canvas size or number of populations.`
      );
    }

    if (particleBufferSize > device.limits.maxStorageBufferBindingSize) {
      throw new Error(
        `Particle buffer size (${(particleBufferSize / 1024 / 1024).toFixed(
          1
        )} MB) exceeds device limit (${(
          device.limits.maxStorageBufferBindingSize /
          1024 /
          1024
        ).toFixed(1)} MB). Try reducing particle count.`
      );
    }

    // Create buffers
    const particleBuffer = device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const trailMapsBuffer = device.createBuffer({
      size: trailMapBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const combinedMapsBuffer = device.createBuffer({
      size: trailMapBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const simulationConfigBuffer = device.createBuffer({
      size: 12, // 3 u32/f32 values
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const populationConfigsBuffer = device.createBuffer({
      size: config.populations.length * 6 * 4, // 6 floats per population
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const attractionTableBuffer = device.createBuffer({
      size: config.populations.length * config.populations.length * 4, // float matrix
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Create pipelines
    const physarumPipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: physarumShader }),
        entryPoint: "main",
      },
    });

    const combinePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: combineShader }),
        entryPoint: "main",
      },
    });

    const diffusePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: diffuseShader }),
        entryPoint: "main",
      },
    });

    const renderPipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({ code: renderShaderVertex }),
        entryPoint: "main",
      },
      fragment: {
        module: device.createShaderModule({ code: renderShaderFrag }),
        entryPoint: "main",
        targets: [{ format: "bgra8unorm" }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    const physarumBindGroup = device.createBindGroup({
      layout: physarumPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: trailMapsBuffer } },
        { binding: 2, resource: { buffer: combinedMapsBuffer } },
        { binding: 3, resource: { buffer: simulationConfigBuffer } },
        { binding: 4, resource: { buffer: populationConfigsBuffer } },
      ],
    });

    const combineBindGroup = device.createBindGroup({
      layout: combinePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: trailMapsBuffer } },
        { binding: 1, resource: { buffer: combinedMapsBuffer } },
        { binding: 2, resource: { buffer: simulationConfigBuffer } },
        { binding: 3, resource: { buffer: attractionTableBuffer } },
      ],
    });

    const diffuseBindGroup = device.createBindGroup({
      layout: diffusePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: trailMapsBuffer } },
        { binding: 1, resource: { buffer: simulationConfigBuffer } },
        { binding: 2, resource: { buffer: populationConfigsBuffer } },
      ],
    });

    this.simulation = {
      device,
      config,
      particleBuffer,
      trailMapsBuffer,
      combinedMapsBuffer,
      simulationConfigBuffer,
      populationConfigsBuffer,
      attractionTableBuffer,
      physarumPipeline,
      combinePipeline,
      diffusePipeline,
      renderPipeline,
      physarumBindGroup,
      combineBindGroup,
      diffuseBindGroup,
    };

    return this.simulation;
  }

  getSimulation(): CreateSimulationPipeline {
    return this.simulation;
  }

  updateComputeStepBuffers(): void {
    const config = this.simulation.config;
    const device = this.simulation.device;

    // Update simulation config
    const simConfigData = new Uint32Array([
      config.width,
      config.height,
      config.populations.length,
    ]);
    device.queue.writeBuffer(
      this.simulation.simulationConfigBuffer,
      0,
      simConfigData
    );

    // Update population configs
    const popConfigData = new Float32Array(config.populations.length * 6);
    for (let i = 0; i < config.populations.length; i++) {
      const pop = config.populations[i];
      popConfigData[i * 6 + 0] = pop.sensor_distance;
      popConfigData[i * 6 + 1] = pop.step_distance;
      popConfigData[i * 6 + 2] = pop.sensor_angle;
      popConfigData[i * 6 + 3] = pop.rotation_angle;
      popConfigData[i * 6 + 4] = pop.decay_factor;
      popConfigData[i * 6 + 5] = pop.deposition_amount;
    }
    device.queue.writeBuffer(
      this.simulation.populationConfigsBuffer,
      0,
      popConfigData
    );

    // Update attraction table
    const attractionData = new Float32Array(
      config.populations.length * config.populations.length
    );
    for (let i = 0; i < config.populations.length; i++) {
      for (let j = 0; j < config.populations.length; j++) {
        attractionData[i * config.populations.length + j] =
          config.attraction_table[i][j];
      }
    }
    device.queue.writeBuffer(
      this.simulation.attractionTableBuffer,
      0,
      attractionData
    );
  }

  runSimulationStep(): void {
    const device = this.simulation.device;
    const config = this.simulation.config;

    this.updateComputeStepBuffers();

    const commandEncoder = device.createCommandEncoder();

    // 1. Combine trail maps with attraction/repulsion
    const combinePass = commandEncoder.beginComputePass();
    combinePass.setPipeline(this.simulation.combinePipeline);
    combinePass.setBindGroup(0, this.simulation.combineBindGroup);
    combinePass.dispatchWorkgroups(
      Math.ceil(config.width / 8),
      Math.ceil(config.height / 8)
    );
    combinePass.end();

    // 2. Agent movement
    const agentPass = commandEncoder.beginComputePass();
    agentPass.setPipeline(this.simulation.physarumPipeline);
    agentPass.setBindGroup(0, this.simulation.physarumBindGroup);

    // Calculate workgroups, ensuring we don't exceed the max limit per dimension (65535)
    const maxWorkgroupsPerDim = 65535;
    const workgroupSize = 64;
    const totalWorkgroups = Math.ceil(this.particleCount / workgroupSize);

    if (totalWorkgroups <= maxWorkgroupsPerDim) {
      // Use 1D dispatch for smaller counts
      agentPass.dispatchWorkgroups(totalWorkgroups);
    } else {
      // Use 2D dispatch for larger counts
      const workgroupsX = Math.min(
        maxWorkgroupsPerDim,
        Math.ceil(Math.sqrt(totalWorkgroups))
      );
      const workgroupsY = Math.ceil(totalWorkgroups / workgroupsX);
      agentPass.dispatchWorkgroups(workgroupsX, workgroupsY);
    }

    agentPass.end();

    // 3. Diffuse trail maps
    const diffusePass = commandEncoder.beginComputePass();
    diffusePass.setPipeline(this.simulation.diffusePipeline);
    diffusePass.setBindGroup(0, this.simulation.diffuseBindGroup);
    diffusePass.dispatchWorkgroups(
      Math.ceil(config.width / 8),
      Math.ceil(config.height / 8)
    );
    diffusePass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  render(context: GPUCanvasContext, colorManager: ColorPaletteManager): void {
    const device = this.simulation.device;

    const populationColorsBuffer = device.createBuffer({
      size: 128, // 128 bytes or 32 floats for 5 populations with padding
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const colorData = colorManager.convertPaletteToFloat32Array(
      this.simulation.config.populations.length
    );
    device.queue.writeBuffer(populationColorsBuffer, 0, colorData);

    const renderBindGroup = device.createBindGroup({
      layout: this.simulation.renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.simulation.trailMapsBuffer } },
        {
          binding: 1,
          resource: { buffer: this.simulation.simulationConfigBuffer },
        },
        { binding: 2, resource: { buffer: populationColorsBuffer } },
      ],
    });

    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    renderPass.setPipeline(this.simulation.renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(6, 1, 0, 0);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getParticlesPerPopulation(): number {
    return this.particlesPerPopulation;
  }

  public initializeParticles(
    simulation: CreateSimulationPipeline,
    config: MultiPopulationConfig
  ): void {
    const particlesPerPopulation = Math.floor(
      this.particleCount / config.populations.length
    );
    const totalData = new Float32Array(this.particleCount * 4);
    for (let globalIdx = 0; globalIdx < this.particleCount; globalIdx++) {
      const i4 = globalIdx * 4;
      totalData[i4 + 0] = Math.random() * config.width;
      totalData[i4 + 1] = Math.random() * config.height;
      totalData[i4 + 2] = Math.random() * Math.PI * 2;
      totalData[i4 + 3] = Math.min(
        Math.floor(globalIdx / particlesPerPopulation),
        config.populations.length - 1
      );
    }
    simulation.device.queue.writeBuffer(
      simulation.particleBuffer,
      0,
      totalData
    );
    this.clearTrailMaps(simulation, config);
  }

  private clearTrailMaps(
    simulation: CreateSimulationPipeline,
    config: MultiPopulationConfig
  ): void {
    const trailMapSize =
      config.width * config.height * config.populations.length;
    const clearData = new Float32Array(trailMapSize);
    simulation.device.queue.writeBuffer(
      simulation.trailMapsBuffer,
      0,
      clearData
    );
    simulation.device.queue.writeBuffer(
      simulation.combinedMapsBuffer,
      0,
      clearData
    );
  }

  public reset(): void {
    this.initializeParticles(this.simulation, this.simulation.config);
  }
}
