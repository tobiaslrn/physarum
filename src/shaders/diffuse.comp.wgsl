struct PopulationConfig {
    sensor_distance: f32,
    step_distance: f32,
    sensor_angle: f32,
    rotation_angle: f32,
    decay_factor: f32,
    deposition_amount: f32,
};

struct SimulationConfig {
    width: u32,
    height: u32,
    num_populations: u32,
};

@group(0) @binding(0) var<storage, read_write> trail_maps: array<f32>;
@group(0) @binding(1) var<uniform> sim_config: SimulationConfig;
@group(0) @binding(2) var<storage, read> population_configs: array<PopulationConfig>;

fn get_trail_value(x: u32, y: u32, population: u32) -> f32 {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    return trail_maps[index];
}

fn set_trail_value(x: u32, y: u32, population: u32, value: f32) {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    trail_maps[index] = value;
}

fn get_blur_kernel(x: u32, y: u32, pop: u32) -> f32 {
    var sum = 0.0;
    var count = 0.0;
    
    for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
            let sample_x = i32(x) + dx;
            let sample_y = i32(y) + dy;
            
            let wrapped_x = u32((sample_x + i32(sim_config.width)) % i32(sim_config.width));
            let wrapped_y = u32((sample_y + i32(sim_config.height)) % i32(sim_config.height));
            
            sum += get_trail_value(wrapped_x, wrapped_y, pop);
            count += 1.0;
        }
    }

    return sum / count;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;

    if (x >= sim_config.width || y >= sim_config.height) {
        return;
    }

    for (var pop = 0u; pop < sim_config.num_populations; pop++) {
        let config = population_configs[pop];
        let blurred_value = get_blur_kernel(x, y, pop) * config.decay_factor;
        set_trail_value(x, y, pop, blurred_value);
    }
}
