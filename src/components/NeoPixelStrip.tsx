/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Layers, HelpCircle, ZoomIn } from "lucide-react";
import { LEDState } from "../types";

interface NeoPixelStripProps {
  leds: LEDState[];
  currentBrightness: number;
}

export default function NeoPixelStrip({ leds, currentBrightness }: NeoPixelStripProps) {
  const [highlightGroup, setHighlightGroup] = useState<string>("all");
  const [hoveredLed, setHoveredLed] = useState<number | null>(null);

  // Group mappings
  // Hour tens: 0..27
  // Hour ones: 28..55
  // Colon 1: 56..57
  // Minute tens: 58..85
  // Minute ones: 86..113
  // Colon 2: 114..115
  // Second tens: 116..136
  // Second ones: 137..157
  const getLEDGroup = (index: number): { name: string; class: string } => {
    if (index >= 0 && index <= 27) return { name: "Hour 10s (Digit 0)", class: "bg-red-500/10 text-red-400" };
    if (index >= 28 && index <= 55) return { name: "Hour 1s (Digit 1)", class: "bg-orange-500/10 text-orange-400" };
    if (index >= 56 && index <= 57) return { name: "Colon 1 (Upper/Lower)", class: "bg-pink-500/10 text-pink-400" };
    if (index >= 58 && index <= 85) return { name: "Minute 10s (Digit 2)", class: "bg-green-500/10 text-green-400" };
    if (index >= 86 && index <= 113) return { name: "Minute 1s (Digit 3)", class: "bg-teal-500/10 text-teal-400" };
    if (index >= 114 && index <= 115) return { name: "Colon 2 (Upper/Lower)", class: "bg-purple-500/10 text-purple-400" };
    if (index >= 116 && index <= 136) return { name: "Second 10s (Digit 4)", class: "bg-blue-500/10 text-blue-400" };
    if (index >= 137 && index <= 157) return { name: "Second 1s (Digit 5)", class: "bg-indigo-500/10 text-indigo-400" };
    return { name: "Unknown", class: "bg-slate-500/10 text-slate-400" };
  };

  const getLEDSegment = (index: number): string => {
    // Determine which digit
    let digitIdx = -1;
    let base = 0;
    let segLEDs = 4;

    if (index >= 0 && index <= 27) { digitIdx = 0; base = 0; }
    else if (index >= 28 && index <= 55) { digitIdx = 1; base = 28; }
    else if (index >= 58 && index <= 85) { digitIdx = 2; base = 58; }
    else if (index >= 86 && index <= 113) { digitIdx = 3; base = 86; }
    else if (index >= 116 && index <= 136) { digitIdx = 4; base = 116; segLEDs = 3; }
    else if (index >= 137 && index <= 157) { digitIdx = 5; base = 137; segLEDs = 3; }

    if (digitIdx === -1) {
      if (index === 56) return "Colon 1 Upper";
      if (index === 57) return "Colon 1 Lower";
      if (index === 114) return "Colon 2 Upper";
      if (index === 115) return "Colon 2 Lower";
      return "";
    }

    // Determine segment (0..6 mapped to G, B, A, F, E, D, C)
    const relativeIndex = index - base;
    const segmentIndex = Math.floor(relativeIndex / segLEDs);
    const ledNum = (relativeIndex % segLEDs) + 1;

    const segments = ["G (Middle)", "B (Top-Right)", "A (Top)", "F (Top-Left)", "E (Bottom-Left)", "D (Bottom)", "C (Bottom-Right)"];
    return `Seg ${segments[segmentIndex]} - LED ${ledNum}/${segLEDs}`;
  };

  const isHighlighted = (index: number): boolean => {
    if (highlightGroup === "all") return true;
    if (highlightGroup === "hours" && index <= 55) return true;
    if (highlightGroup === "colons" && (index === 56 || index === 57 || index === 114 || index === 115)) return true;
    if (highlightGroup === "minutes" && index >= 58 && index <= 113) return true;
    if (highlightGroup === "seconds" && index >= 116 && index <= 157) return true;
    return false;
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">158-NeoPixel Strip View</h3>
            <p className="text-[11px] text-slate-400 font-mono">Arduino PIN 6 output stream</p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850">
          Brightness: <span className="text-indigo-400 font-bold">{Math.round((currentBrightness * 100) / 255)}%</span>
        </div>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          { id: "all", label: "Show All leds" },
          { id: "hours", label: "Hours (0-55)" },
          { id: "colons", label: "Colons (56-57, 114-115)" },
          { id: "minutes", label: "Minutes (58-113)" },
          { id: "seconds", label: "Seconds (116-157)" },
        ].map((g) => (
          <button
            key={g.id}
            onClick={() => setHighlightGroup(g.id)}
            className={`text-[10px] px-2.5 py-1 rounded-md font-mono transition-all ${
              highlightGroup === g.id
                ? "bg-indigo-600 text-white font-semibold shadow-md"
                : "bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* LEDs Grid */}
      <div className="flex-1 bg-slate-950 rounded-xl p-3 border border-slate-850 overflow-y-auto max-h-[300px] sm:max-h-[340px] md:max-h-full">
        <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-10 gap-2 select-none">
          {leds.map((led, index) => {
            const active = isHighlighted(index);
            const isOff = led.color === "#000000";
            const currentHovered = hoveredLed === index;

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredLed(index)}
                onMouseLeave={() => setHoveredLed(null)}
                className="relative flex flex-col items-center justify-center cursor-help transition-transform"
                style={{
                  opacity: active ? 1 : 0.25,
                  transform: currentHovered ? "scale(1.2)" : "scale(1)",
                }}
              >
                {/* Visual LED */}
                <div
                  className="w-5 h-5 rounded-full border border-slate-800 transition-all duration-150 flex items-center justify-center text-[8px] font-mono font-bold"
                  style={{
                    backgroundColor: isOff ? "#1e293b" : led.color,
                    boxShadow: isOff
                      ? "none"
                      : `0 0 10px ${led.color}, 0 0 4px ${led.color} inset`,
                    color: isOff ? "#64748b" : "#ffffff",
                    textShadow: isOff ? "none" : "0 1px 2px rgba(0,0,0,0.8)"
                  }}
                >
                  {/* Just a tiny indicator or index if it fits */}
                </div>
                {/* Index label underneath */}
                <span className="text-[9px] font-mono text-slate-500 mt-1 select-all">
                  {index}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* LED Info card */}
      <div className="mt-4 bg-slate-950/60 rounded-xl border border-slate-850 p-3 min-h-[70px] flex items-center justify-between font-mono">
        {hoveredLed !== null ? (
          <div className="text-left w-full">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                LED Index: <span className="text-indigo-400 font-bold">{hoveredLed}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${getLEDGroup(hoveredLed).class}`}>
                {getLEDGroup(hoveredLed).name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mt-1.5">
              <div>Role: <span className="text-slate-200">{getLEDSegment(hoveredLed)}</span></div>
              <div className="text-right">Color: <span className="font-bold uppercase" style={{ color: leds[hoveredLed].color !== "#000000" ? leds[hoveredLed].color : "#94a3b8" }}>{leds[hoveredLed].color}</span></div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-[11px] flex items-center gap-2 mx-auto justify-center">
            <HelpCircle className="w-4 h-4 text-slate-500 animate-pulse" />
            <span>Hover over any pixel circle to inspect its index & function.</span>
          </div>
        )}
      </div>
    </div>
  );
}
