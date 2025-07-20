struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

struct SimulationConfig {
    width: u32,
    height: u32,
    num_populations: u32,
};

struct PopulationColors {
    colors: array<vec4<f32>, 8>, 
};

@group(0) @binding(0) var<storage, read> trail_maps: array<f32>;
@group(0) @binding(1) var<uniform> sim_config: SimulationConfig;
@group(0) @binding(2) var<uniform> population_colors: PopulationColors;

fn get_trail_value(x: u32, y: u32, population: u32) -> f32 {
    let map_size = sim_config.width * sim_config.height;
    let index = population * map_size + y * sim_config.width + x;
    return trail_maps[index];
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4<f32> {
    let coord = vec2<u32>(input.uv * vec2<f32>(f32(sim_config.width), f32(sim_config.height)));
    let x = coord.x;
    let y = coord.y;
    
    var final_color = vec3<f32>(0.0, 0.0, 0.0);
    
    for (var pop = 0u; pop < sim_config.num_populations; pop++) {
        let trail_value = get_trail_value(x, y, pop);
        let normalized_value = clamp(trail_value * 0.01, 0.0, 1.0); 
        
        let gamma_corrected = pow(normalized_value, 1.0 / 2.2);
        
        final_color += population_colors.colors[pop].rgb * gamma_corrected;
    }
    
    return vec4<f32>(final_color, 1.0);
}
