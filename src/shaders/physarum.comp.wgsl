struct Particle {
    position: vec2<f32>,
    direction: f32,
    population_id: f32, 
};

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

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> trail_maps: array<f32>; 
@group(0) @binding(2) var<storage, read_write> combined_maps: array<f32>; 
@group(0) @binding(3) var<uniform> sim_config: SimulationConfig;
@group(0) @binding(4) var<storage, read> population_configs: array<PopulationConfig>;

fn get_trail_value(x: u32, y: u32, population: u32) -> f32 {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    return trail_maps[index];
}

fn get_combined_value(x: u32, y: u32, population: u32) -> f32 {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    return combined_maps[index];
}

fn set_trail_value(x: u32, y: u32, population: u32, value: f32) {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    trail_maps[index] = value;
}

fn add_trail_value(x: u32, y: u32, population: u32, value: f32) {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    trail_maps[index] += value;
}

fn wrap_coord(coord: i32, max_val: u32) -> u32 {
    if (coord < 0) {
        return u32(coord + i32(max_val));
    } else if (coord >= i32(max_val)) {
        return u32(coord - i32(max_val));
    }
    return u32(coord);
}

fn sense(particle: Particle, sensor_angle_offset: f32) -> f32 {
    let population_id = u32(particle.population_id);
    let config = population_configs[population_id];
    let sensor_angle = particle.direction + sensor_angle_offset;
    let sensor_pos_x = particle.position.x + cos(sensor_angle) * config.sensor_distance;
    let sensor_pos_y = particle.position.y + sin(sensor_angle) * config.sensor_distance;
    
    // Wrap coordinates
    let wrapped_x = wrap_coord(i32(sensor_pos_x), sim_config.width);
    let wrapped_y = wrap_coord(i32(sensor_pos_y), sim_config.height);
    
    return get_combined_value(wrapped_x, wrapped_y, population_id);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    // Handle both 1D and 2D dispatches
    // For 1D: index = global_id.x
    // For 2D: index = global_id.y * max_workgroups_x * workgroup_size + global_id.x
    let max_workgroups_per_dim = 65535u;
    let workgroup_size = 64u;
    let index = global_id.y * max_workgroups_per_dim * workgroup_size + global_id.x;

    if (index >= arrayLength(&particles)) {
        return;
    }

    var particle = particles[index];
    let population_id = u32(particle.population_id);
    let config = population_configs[population_id];

    let trail_c = sense(particle, 0.0);
    let trail_l = sense(particle, -config.sensor_angle);
    let trail_r = sense(particle, config.sensor_angle);

    // Determine movement direction
    var new_direction = particle.direction;
    if (trail_c > trail_l && trail_c > trail_r) {
        // Continue straight
    } else if (trail_l < trail_r) {
        new_direction += config.rotation_angle;
    } else if (trail_r < trail_l) {
        new_direction -= config.rotation_angle;
    } else {
        // Random turn when equal
        let random_factor = fract(sin(f32(index) * 12.9898 + particle.direction) * 43758.5453);
        let random_turn = (random_factor - 0.5) * 2.0;
        new_direction += config.rotation_angle * random_turn;
    }
    particle.direction = new_direction;

    // Move particle
    particle.position += vec2<f32>(cos(particle.direction), sin(particle.direction)) * config.step_distance;

    // Wrap around edges
    if (particle.position.x < 0.0) { particle.position.x += f32(sim_config.width); }
    if (particle.position.x >= f32(sim_config.width)) { particle.position.x -= f32(sim_config.width); }
    if (particle.position.y < 0.0) { particle.position.y += f32(sim_config.height); }
    if (particle.position.y >= f32(sim_config.height)) { particle.position.y -= f32(sim_config.height); }

    add_trail_value(u32(particle.position.x), u32(particle.position.y), population_id, config.deposition_amount);

    particles[index] = particle;
}
