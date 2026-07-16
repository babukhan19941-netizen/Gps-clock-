/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Mode {
  NORMAL = "NORMAL",
  SHOW_TEMP = "SHOW_TEMP",
  SHOW_12_24 = "SHOW_12_24",
  SHOW_BRIGHTNESS = "SHOW_BRIGHTNESS",
  WAIT_GPS = "WAIT_GPS"
}

export interface LEDState {
  index: number;
  color: string; // hex color #RRGGBB
  brightness: number; // 0 to 255
}

export interface SerialLog {
  timestamp: string;
  text: string;
  type: "info" | "gps" | "temp" | "eeprom" | "button" | "warning";
}

export const PRESET_COLORS_HEX = [
  0xFF0000, // Red
  0x00FF00, // Green
  0x0000FF, // Blue
  0xFFFF00, // Yellow
  0x00FFFF, // Cyan
  0xFF00FF, // Magenta
  0xFFFFFF  // White
];

export const COLOR_NAMES = [
  "Red",
  "Green",
  "Blue",
  "Yellow",
  "Cyan",
  "Magenta",
  "White",
  "Rainbow"
];

// G, B, A, F, E, D, C (7 segments)
export const DIGIT_CODES = [
  [0, 1, 1, 1, 1, 1, 1], // 0
  [0, 1, 0, 0, 0, 0, 1], // 1
  [1, 1, 1, 0, 1, 1, 0], // 2
  [1, 1, 1, 0, 0, 1, 1], // 3
  [1, 1, 0, 1, 0, 0, 1], // 4
  [1, 0, 1, 1, 0, 1, 1], // 5
  [1, 0, 1, 1, 1, 1, 1], // 6
  [0, 1, 1, 0, 0, 0, 1], // 7
  [1, 1, 1, 1, 1, 1, 1], // 8
  [1, 1, 1, 1, 0, 1, 1], // 9
  [0, 0, 0, 0, 0, 0, 0], // 10 blank
  [0, 0, 0, 0, 0, 0, 0], // 11 blank
  [1, 1, 1, 1, 0, 0, 0], // 12 ° symbol
  [0, 0, 1, 1, 1, 1, 0]  // 13 C symbol
];

// Mapping indices of segments G, B, A, F, E, D, C to visual names/positions
// s=0 -> G (middle)
// s=1 -> B (top right)
// s=2 -> A (top)
// s=3 -> F (top left)
// s=4 -> E (bottom left)
// s=5 -> D (bottom)
// s=6 -> C (bottom right)
export const SEGMENT_MAP = ["G", "B", "A", "F", "E", "D", "C"];
export const SEGMENT_LABELS = {
  A: "Top",
  B: "Top Right",
  C: "Bottom Right",
  D: "Bottom",
  E: "Bottom Left",
  F: "Top Left",
  G: "Middle"
};
