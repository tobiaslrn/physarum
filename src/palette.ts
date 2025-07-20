export interface ColorPalette {
  name: string;
  colors: string[];
}

export class ColorPaletteManager {
  private currentPaletteIndex: number = 0;
  private currentColors: string[] = [];

  constructor() {
    this.currentColors = [...COLOR_PALETTES[0].colors];
  }

  getCurrentColors(): string[] {
    return [...this.currentColors];
  }

  getCurrentPaletteIndex(): number {
    return this.currentPaletteIndex;
  }

  updateColorsFromPalette(paletteIndex: number): string[] {
    if (paletteIndex >= 0 && paletteIndex < COLOR_PALETTES.length) {
      this.currentPaletteIndex = paletteIndex;
      const palette = COLOR_PALETTES[this.currentPaletteIndex];
      this.currentColors = [...palette.colors];
    }
    return this.getCurrentColors();
  }

  updateColorsFromPaletteName(paletteName: string): string[] {
    const index = COLOR_PALETTES.findIndex((p) => p.name === paletteName);
    if (index !== -1) {
      return this.updateColorsFromPalette(index);
    }
    return this.getCurrentColors();
  }

  updateIndividualColor(index: number, color: string): void {
    if (index >= 0 && index < this.currentColors.length) {
      this.currentColors[index] = color;
    }
  }

  convertPaletteToFloat32Array(numPopulations: number): Float32Array {
    const colorData = new Float32Array(32);
    for (let i = 0; i < numPopulations; i++) {
      const colorIndex = i % this.currentColors.length;
      const [r, g, b] = hexToRgb(this.currentColors[colorIndex]);
      colorData[i * 4 + 0] = r;
      colorData[i * 4 + 1] = g;
      colorData[i * 4 + 2] = b;
      colorData[i * 4 + 3] = 0.0; // Padding
    }
    return colorData;
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    name: "Membrane Flare",
    colors: ["#FA2B31", "#FFBF1F", "#FFF146", "#ABE319", "#00C481"],
  },
  {
    name: "Stained Slide",
    colors: ["#8FB2F7", "#1F8A70", "#BEDB39", "#FFE11A", "#FD7400"],
  },
  {
    name: "Cytoplasmic Pulse",
    colors: ["#FAC287", "#9D1DF2", "#BEDB39", "#FFE11A", "#FD7400"],
  },
  {
    name: "Osmotic Pop",
    colors: ["#4DC6EB", "#3BE36B", "#BEDB39", "#FFE11A", "#FD7400"],
  },
  {
    name: "Nucleus Grid",
    colors: ["#334D5C", "#45B29D", "#EFC94C", "#E27A3F", "#DF5A49"],
  },
  {
    name: "Signal Bloom",
    colors: ["#FF8000", "#FFD933", "#CCCC52", "#8FB359", "#192B33"],
  },
  {
    name: "Chromatin Flame",
    colors: ["#730046", "#BFBB11", "#FFC200", "#E88801", "#C93C00"],
  },
  {
    name: "Microtubule Echo",
    colors: ["#E6DD00", "#8CB302", "#008C74", "#004C66", "#332B40"],
  },
  {
    name: "Vesicle Flash",
    colors: ["#F15A5A", "#F0C419", "#4EBA6F", "#2D95BF", "#955BA5"],
  },
  {
    name: "Cosmic Cytoplasm",
    colors: ["#F41C54", "#FF9F00", "#FBD506", "#A8BF12", "#00AAB5"],
  },
];
