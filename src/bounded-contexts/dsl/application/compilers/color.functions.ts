/**
 * Color Functions for Theme DSL
 *
 * Functions for manipulating colors in expressions.
 * Supports hex, rgb, and rgba formats.
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Parse a color string to RGB values.
 */
function parseColor(color: string): RGB {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const fullHex =
      hex.length === 3
        ? hex
            .split('')
            .map((c) => c + c)
            .join('')
        : hex;

    return {
      r: parseInt(fullHex.slice(0, 2), 16),
      g: parseInt(fullHex.slice(2, 4), 16),
      b: parseInt(fullHex.slice(4, 6), 16),
    };
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  // Default to black
  return { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex string.
 */
function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert RGB to HSL.
 */
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB.
 */
function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Calculate relative luminance of a color.
 */
function luminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : ((val + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const colorFunctions = {
  /**
   * Lighten a color by a percentage (0-100).
   */
  lighten(color: string, amount: number): string {
    const rgb = parseColor(color);
    const hsl = rgbToHsl(rgb);
    hsl.l = Math.min(1, hsl.l + amount / 100);
    return rgbToHex(hslToRgb(hsl));
  },

  /**
   * Darken a color by a percentage (0-100).
   */
  darken(color: string, amount: number): string {
    const rgb = parseColor(color);
    const hsl = rgbToHsl(rgb);
    hsl.l = Math.max(0, hsl.l - amount / 100);
    return rgbToHex(hslToRgb(hsl));
  },

  /**
   * Saturate a color by a percentage (0-100).
   */
  saturate(color: string, amount: number): string {
    const rgb = parseColor(color);
    const hsl = rgbToHsl(rgb);
    hsl.s = Math.min(1, hsl.s + amount / 100);
    return rgbToHex(hslToRgb(hsl));
  },

  /**
   * Desaturate a color by a percentage (0-100).
   */
  desaturate(color: string, amount: number): string {
    const rgb = parseColor(color);
    const hsl = rgbToHsl(rgb);
    hsl.s = Math.max(0, hsl.s - amount / 100);
    return rgbToHex(hslToRgb(hsl));
  },

  /**
   * Set the alpha channel of a color.
   */
  alpha(color: string, a: number): string {
    const rgb = parseColor(color);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  },

  /**
   * Mix two colors by a weight (0-1, where 0 = first color, 1 = second color).
   */
  mix(color1: string, color2: string, weight = 0.5): string {
    const rgb1 = parseColor(color1);
    const rgb2 = parseColor(color2);

    return rgbToHex({
      r: rgb1.r * (1 - weight) + rgb2.r * weight,
      g: rgb1.g * (1 - weight) + rgb2.g * weight,
      b: rgb1.b * (1 - weight) + rgb2.b * weight,
    });
  },

  /**
   * Return black or white based on the contrast with the input color.
   */
  contrast(color: string): string {
    const rgb = parseColor(color);
    const lum = luminance(rgb);
    return lum > 0.179 ? '#000000' : '#ffffff';
  },
};
