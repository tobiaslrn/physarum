struct SimulationConfig {
    width: u32,
    height: u32,
    num_populations: u32,
};

@group(0) @binding(0) var<storage, read> trail_maps: array<f32>; 
@group(0) @binding(1) var<storage, read_write> combined_maps: array<f32>; 
@group(0) @binding(2) var<uniform> sim_config: SimulationConfig;
@group(0) @binding(3) var<storage, read> attraction_table: array<f32>; // Flattened 2D array

fn get_trail_value(x: u32, y: u32, population: u32) -> f32 {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    return trail_maps[index];
}

fn set_combined_value(x: u32, y: u32, population: u32, value: f32) {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    combined_maps[index] = value;
}

fn get_attraction_factor(from_pop: u32, to_pop: u32) -> f32 {
    let index = from_pop * sim_config.num_populations + to_pop;
    return attraction_table[index];
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let x = global_id.x;
    let y = global_id.y;

    if (x >= sim_config.width || y >= sim_config.height) {
        return;
    }

    // For each population, compute the combined attraction/repulsion field
    for (var target_pop = 0u; target_pop < sim_config.num_populations; target_pop++) {
        var combined_value = 0.0;
        
        // Sum contributions from all populations based on attraction table
        for (var source_pop = 0u; source_pop < sim_config.num_populations; source_pop++) {
            let trail_value = get_trail_value(x, y, source_pop);
            let attraction_factor = get_attraction_factor(target_pop, source_pop);
            combined_value += trail_value * attraction_factor;
        }
        
        set_combined_value(x, y, target_pop, combined_value);
    }
}
