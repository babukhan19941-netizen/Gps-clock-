/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LEDState, DIGIT_CODES } from "../types";

interface DigitDisplayProps {
  digitIndex: number; // 0 to 5
  value: number; // -1 (blank) or 0 to 13
  baseLedIndex: number; // base index in LED strip
  segLEDsCount: number; // 3 or 4
  leds: LEDState[];
  isHoursOrMinutes: boolean;
}

export default function DigitDisplay({
  digitIndex,
  value,
  baseLedIndex,
  segLEDsCount,
  leds,
  isHoursOrMinutes,
}: DigitDisplayProps) {
  // s=0 -> G (middle)
  // s=1 -> B (top right)
  // s=2 -> A (top)
  // s=3 -> F (top left)
  // s=4 -> E (bottom left)
  // s=5 -> D (bottom)
  // s=6 -> C (bottom right)

  // Segment configurations with layout classes
  // Each segment maps to its segment index `s` in Arduino's `digitCode` array.
  const segments = [
    { s: 2, name: "A", orientation: "h", style: "top-[4%] left-[10%] right-[10%] h-[10%]" }, // Top
    { s: 3, name: "F", orientation: "v", style: "top-[10%] bottom-[50%] left-[2%] w-[10%]" }, // Top Left
    { s: 1, name: "B", orientation: "v", style: "top-[10%] bottom-[50%] right-[2%] w-[10%]" }, // Top Right
    { s: 0, name: "G", orientation: "h", style: "top-[45%] bottom-[45%] left-[10%] right-[10%] h-[10%]" }, // Middle
    { s: 4, name: "E", orientation: "v", style: "top-[50%] bottom-[10%] left-[2%] w-[10%]" }, // Bottom Left
    { s: 6, name: "C", orientation: "v", style: "top-[50%] bottom-[10%] right-[2%] w-[10%]" }, // Bottom Right
    { s: 5, name: "D", orientation: "h", style: "bottom-[4%] left-[10%] right-[10%] h-[10%]" }, // Bottom
  ];

  // Helper to check if a segment should be lit in the segment code
  const isSegmentActiveInCode = (segmentSIndex: number) => {
    if (value === -1) return false;
    if (value < 0 || value > 13) return false;
    return DIGIT_CODES[value][segmentSIndex] === 1;
  };

  return (
    <div
      className={`relative rounded-xl bg-slate-950/40 border border-slate-900/40 p-1 flex items-center justify-center select-none ${
        isHoursOrMinutes ? "w-14 h-24 sm:w-20 sm:h-32" : "w-11 h-18 sm:w-14 sm:h-22"
      }`}
    >
      {/* Background segments for a realistic LCD ghost shadow */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        {segments.map((seg) => (
          <div
            key={`ghost-${seg.name}`}
            className={`absolute rounded bg-slate-400 ${seg.style}`}
          />
        ))}
      </div>

      {/* Actual Segments containing the simulated LEDs */}
      {segments.map((seg) => {
        const active = isSegmentActiveInCode(seg.s);

        // Get the LEDs corresponding to this segment
        // Formula: p = baseLedIndex + s * segLEDsCount + l
        const segmentLeds: LEDState[] = [];
        for (let l = 0; l < segLEDsCount; l++) {
          const ledIndex = baseLedIndex + seg.s * segLEDsCount + l;
          if (ledIndex < leds.length) {
            segmentLeds.push(leds[ledIndex]);
          }
        }

        return (
          <div
            key={`seg-${seg.name}`}
            className={`absolute flex rounded transition-all duration-200 ${seg.style} ${
              seg.orientation === "h"
                ? "flex-row justify-around items-center px-1"
                : "flex-col justify-around items-center py-1"
            }`}
            style={{
              backgroundColor: active ? "rgba(30, 41, 59, 0.15)" : "transparent",
            }}
            title={`Digit ${digitIndex} Segment ${seg.name}`}
          >
            {/* Render each individual LED inside this segment */}
            {segmentLeds.map((led) => {
              const isOff = led.color === "#000000";
              const ledColor = isOff ? "#1e293b" : led.color;
              const shadowGlow = isOff
                ? "none"
                : `0 0 12px ${led.color}, 0 0 4px ${led.color} inset`;

              return (
                <div
                  key={`led-${led.index}`}
                  className={`rounded-full transition-all duration-150 ${
                    isHoursOrMinutes ? "w-1.5 h-1.5 sm:w-2.5 sm:h-2.5" : "w-1 h-1 sm:w-1.5 sm:h-1.5"
                  }`}
                  style={{
                    backgroundColor: ledColor,
                    boxShadow: shadowGlow,
                    border: `1px solid ${isOff ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.2)"}`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
