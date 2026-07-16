/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  Radio,
  Thermometer,
  Layers,
  Terminal,
  HelpCircle,
  Database,
  Cpu,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react";

import {
  Mode,
  LEDState,
  SerialLog,
  PRESET_COLORS_HEX,
  COLOR_NAMES,
  DIGIT_CODES,
  SEGMENT_MAP,
} from "./types";

import DigitDisplay from "./components/DigitDisplay";
import HardwareControls from "./components/HardwareControls";
import NeoPixelStrip from "./components/NeoPixelStrip";

// Sound effects using Web Audio API (so no external files needed)
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialized when first used
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch (e) {
      // Audio context block
    }
  }

  playBeep() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(2000, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      // Audio block
    }
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Note 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(1200, t);
      gain1.gain.setValueAtTime(0.05, t);
      gain1.gain.linearRampToValueAtTime(0.001, t + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.1);

      // Note 2
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(1600, t + 0.08);
      gain2.gain.setValueAtTime(0.05, t + 0.08);
      gain2.gain.linearRampToValueAtTime(0.001, t + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.08);
      osc2.stop(t + 0.22);
    } catch (e) {
      // Audio block
    }
  }
}

const sound = new SoundManager();

export default function App() {
  // --- Arduino Core States ---
  const [currentHour, setCurrentHour] = useState<number>(10);
  const [currentMinute, setCurrentMinute] = useState<number>(23);
  const [currentSecond, setCurrentSecond] = useState<number>(20);
  const [currentDay, setCurrentDay] = useState<number>(15);
  const [currentMonth, setCurrentMonth] = useState<number>(7);
  const [currentYear, setCurrentYear] = useState<number>(2026);

  const [use12h, setUse12h] = useState<boolean>(true);
  const [colorIndex, setColorIndex] = useState<number>(7); // Default to Rainbow (Index 7)
  const [currentBrightness, setCurrentBrightness] = useState<number>(128); // Mid brightness

  const [currentMode, setCurrentMode] = useState<Mode>(Mode.WAIT_GPS);
  const [previousMode, setPreviousMode] = useState<Mode>(Mode.NORMAL);

  // --- External Sensors & Environment ---
  const [gpsSignal, setGpsSignal] = useState<boolean>(true);
  const [gpsTimeReceived, setGpsTimeReceived] = useState<boolean>(true);
  const [externalTemp, setExternalTemp] = useState<number>(25.5);
  const [showingTemp, setShowingTemp] = useState<boolean>(false);
  const [lastGPSDataTime, setLastGPSDataTime] = useState<number>(Date.now());

  // --- Phone GPS Geolocation States ---
  const [gpsSyncing, setGpsSyncing] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [realGpsData, setRealGpsData] = useState<{
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    altitude: number | null;
    syncTime: string | null;
  } | null>(null);

  // --- UI & Manual Setting states ---
  const [isManualSetHours, setIsManualSetHours] = useState<boolean>(false);
  const [isManualSetMinutes, setIsManualSetMinutes] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"controls" | "pixels">("controls");

  // --- Dynamic Simulation variables ---
  const [millis, setMillis] = useState<number>(0);
  const [baseHue, setBaseHue] = useState<number>(0);
  const [blinkState, setBlinkState] = useState<boolean>(true);
  
  // Simulated Buttons Visual Feedback
  const [btnColorPressed, setBtnColorPressed] = useState<boolean>(false);
  const [btn1224Pressed, setBtn1224Pressed] = useState<boolean>(false);
  const [btnBrightnessPressed, setBtnBrightnessPressed] = useState<boolean>(false);
  const [btnModePressed, setBtnModePressed] = useState<boolean>(false);
  const [btnUpPressed, setBtnUpPressed] = useState<boolean>(false);
  const [btnDownPressed, setBtnDownPressed] = useState<boolean>(false);

  // Serial Terminal Logs
  const [logs, setLogs] = useState<SerialLog[]>([]);

  // Ref to prevent stale interval closures
  const stateRef = useRef({
    currentHour,
    currentMinute,
    currentSecond,
    currentDay,
    currentMonth,
    currentYear,
    use12h,
    colorIndex,
    currentBrightness,
    currentMode,
    previousMode,
    gpsSignal,
    gpsTimeReceived,
    externalTemp,
    showingTemp,
    lastGPSDataTime,
    millis,
    baseHue,
    blinkState,
    isManualSetHours,
    isManualSetMinutes
  });

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = {
      currentHour,
      currentMinute,
      currentSecond,
      currentDay,
      currentMonth,
      currentYear,
      use12h,
      colorIndex,
      currentBrightness,
      currentMode,
      previousMode,
      gpsSignal,
      gpsTimeReceived,
      externalTemp,
      showingTemp,
      lastGPSDataTime,
      millis,
      baseHue,
      blinkState,
      isManualSetHours,
      isManualSetMinutes
    };
  }, [
    currentHour,
    currentMinute,
    currentSecond,
    currentDay,
    currentMonth,
    currentYear,
    use12h,
    colorIndex,
    currentBrightness,
    currentMode,
    previousMode,
    gpsSignal,
    gpsTimeReceived,
    externalTemp,
    showingTemp,
    lastGPSDataTime,
    millis,
    baseHue,
    blinkState,
    isManualSetHours,
    isManualSetMinutes
  ]);

  // Helper: Append Serial Log
  const addLog = (text: string, type: SerialLog["type"] = "info") => {
    const now = new Date();
    const ts = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
    setLogs((prev) => [...prev, { timestamp: ts, text, type }].slice(-150)); // Keep last 150
  };

  // --- Initial Arduino Boot Simulation ---
  useEffect(() => {
    addLog("--- Arduino Bootup Sequence Started ---", "info");
    addLog("Serial.begin(9600) opened.", "info");
    addLog("DS18B20 Temperature Sensor Initialized (1-wire pin D4)", "temp");
    addLog("NEO-6M GPS Module Initialized (SoftwareSerial RX:D8, TX:D9)", "gps");
    addLog("EEPROM Restored settings:", "eeprom");
    addLog(`  -> 12-Hour Format: ${use12h ? "ON" : "OFF"} (EEPROM Addr 0x00)`, "eeprom");
    addLog(`  -> Selected Color Index: ${colorIndex} (${COLOR_NAMES[colorIndex]}) (EEPROM Addr 0x01)`, "eeprom");
    addLog(`  -> Brightness: ${currentBrightness} (${Math.round((currentBrightness * 100) / 255)}%) (EEPROM Addr 0x02)`, "eeprom");
    addLog("Clock Started. Total LEDs Configured: 158 (PIN 6)", "info");

    if (!gpsTimeReceived) {
      addLog("GPS Time Sync: Waiting for valid signal...", "warning");
    } else {
      addLog("GPS TIME ACQUIRED! Internal clock synced.", "gps");
    }
  }, []);

  // --- Main Simulation Loop (Simulating 30ms timer) ---
  useEffect(() => {
    let secondAcc = 0;
    let blinkAcc = 0;
    let gpsTimeoutAcc = 0;
    let tempCycleAcc = 0;
    let showDurationAcc = 0;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const state = stateRef.current;

      // Update virtual millis & rainbow base hue
      setMillis((prev) => prev + 30);
      setBaseHue((prev) => (prev + 0.3) % 256);

      // Handle blink state (every 500ms)
      blinkAcc += 30;
      if (blinkAcc >= 500) {
        blinkAcc = 0;
        setBlinkState((prev) => !prev);
      }

      // Handle GPS Signal Lost warning (if GPS active but lost signal for 10s)
      if (state.gpsTimeReceived && state.gpsSignal) {
        gpsTimeoutAcc += 30;
        if (gpsTimeoutAcc >= 10000) {
          gpsTimeoutAcc = 0;
          addLog(
            `WARNING: GPS signal lost! Last time: ${String(state.currentHour).padStart(2, "0")}:${String(
              state.currentMinute
            ).padStart(2, "0")}:${String(state.currentSecond).padStart(2, "0")}`,
            "warning"
          );
        }
      } else {
        gpsTimeoutAcc = 0;
      }

      // Automatically tick second every 1000ms
      secondAcc += 30;
      if (secondAcc >= 1000) {
        secondAcc = 0;

        // Skip ticking if in manual setting mode
        if (!state.isManualSetHours && !state.isManualSetMinutes) {
          setCurrentSecond((prevSec) => {
            let nextSec = prevSec + 1;
            if (nextSec >= 60) {
              nextSec = 0;
              setCurrentMinute((prevMin) => {
                let nextMin = prevMin + 1;
                if (nextMin >= 60) {
                  nextMin = 0;
                  setCurrentHour((prevHr) => {
                    let nextHr = prevHr + 1;
                    if (nextHr >= 24) {
                      nextHr = 0;
                      setCurrentDay((d) => d + 1); // Simple date increment
                    }
                    return nextHr;
                  });
                }
                return nextMin;
              });
            }
            return nextSec;
          });
        }
      }

      // Auto temperature show logic: Every 20 seconds, show temperature for 2s
      if (state.currentMode === Mode.NORMAL && !state.showingTemp && state.currentSecond % 20 === 0 && state.currentSecond !== 0) {
        setShowingTemp(true);
        setPreviousMode(Mode.NORMAL);
        setCurrentMode(Mode.SHOW_TEMP);
        addLog(`[AUTO-EVENT] Querying DS18B20... Temperature: ${state.externalTemp.toFixed(1)}°C`, "temp");
        sound.playBeep();
      }

      if (state.showingTemp && state.currentMode === Mode.SHOW_TEMP) {
        tempCycleAcc += 30;
        if (tempCycleAcc >= 2000) { // 2 seconds
          tempCycleAcc = 0;
          setShowingTemp(false);
          setCurrentMode(Mode.NORMAL);
          addLog("[AUTO-EVENT] Temperature display timeout. Returning to Normal Time.", "info");
        }
      } else {
        tempCycleAcc = 0;
      }

      // Handle temporary modes display durations (SHOW_12_24 and SHOW_BRIGHTNESS last 2s)
      if (state.currentMode === Mode.SHOW_12_24 || state.currentMode === Mode.SHOW_BRIGHTNESS) {
        showDurationAcc += 30;
        if (showDurationAcc >= 2000) {
          showDurationAcc = 0;
          setCurrentMode(state.previousMode);
          addLog(`Config display timeout. Restoring to ${state.previousMode} mode.`, "info");
        }
      } else {
        showDurationAcc = 0;
      }

    }, 30);

    return () => clearInterval(interval);
  }, []);

  // --- Color wheel utility for smooth RGB transitions ---
  const getWheelColor = (pos: number) => {
    pos = 255 - (pos & 255);
    if (pos < 85) {
      return { r: 255 - pos * 3, g: 0, b: pos * 3 };
    } else if (pos < 170) {
      pos -= 85;
      return { r: 0, g: pos * 3, b: 255 - pos * 3 };
    } else {
      pos -= 170;
      return { r: pos * 3, g: 255 - pos * 3, b: 0 };
    }
  };

  const rgbToHexStr = (r: number, g: number, b: number, brightness: number): string => {
    const factor = brightness / 255;
    const rs = Math.max(0, Math.min(255, Math.round(r * factor)));
    const gs = Math.max(0, Math.min(255, Math.round(g * factor)));
    const bs = Math.max(0, Math.min(255, Math.round(b * factor)));
    return "#" + ((1 << 24) + (rs << 16) + (gs << 8) + bs).toString(16).slice(1);
  };

  // --- Calculate simulated physical NeoPixel color states (158 pixels) ---
  const leds: LEDState[] = [];
  const digitStart = [0, 28, 58, 86, 116, 137];
  const colon1 = [56, 57];
  const colon2 = [114, 115];

  // Helper to determine LED color based on settings
  const calculateLEDColor = (pixelIndex: number) => {
    if (colorIndex === 7) {
      // Rainbow Mode - calculating smooth hue per pixel
      const pixelHue = (baseHue + pixelIndex * 2) & 255;
      const rgb = getWheelColor(pixelHue);
      return rgbToHexStr(rgb.r, rgb.g, rgb.b, currentBrightness);
    } else {
      // Solid Preset Color
      const hex = PRESET_COLORS_HEX[colorIndex];
      const r = (hex >> 16) & 0xff;
      const g = (hex >> 8) & 0xff;
      const b = hex & 0xff;
      return rgbToHexStr(r, g, b, currentBrightness);
    }
  };

  // Initialize all pixels to black (off)
  for (let i = 0; i < 158; i++) {
    leds.push({ index: i, color: "#000000", brightness: currentBrightness });
  }

  // Helper to set digit segments in state array
  const drawDigitToLeds = (digitIndex: number, value: number, segLEDsCount: number) => {
    const base = digitStart[digitIndex];
    if (value === -1) return; // blank digit stays black
    if (value < 0 || value > 13) value = 0;

    for (let s = 0; s < 7; s++) {
      const segmentActive = DIGIT_CODES[value][s] === 1;
      for (let l = 0; l < segLEDsCount; l++) {
        const pixelIdx = base + s * segLEDsCount + l;
        if (pixelIdx < leds.length) {
          leds[pixelIdx].color = segmentActive ? calculateLEDColor(pixelIdx) : "#000000";
        }
      }
    }
  };

  // Render pixels according to simulation modes
  if (currentMode === Mode.WAIT_GPS) {
    // Digits are blank
    for (let i = 0; i < 6; i++) {
      drawDigitToLeds(i, -1, i < 4 ? 4 : 3);
    }
    // Colons blink
    const colonBright = blinkState ? currentBrightness : 40;
    const colonColorIndex = colorIndex === 7 ? 0 : colorIndex;
    const hex = PRESET_COLORS_HEX[colonColorIndex];
    const r = (hex >> 16) & 0xff;
    const g = (hex >> 8) & 0xff;
    const b = hex & 0xff;
    const colorStr = rgbToHexStr(r, g, b, colonBright);

    colon1.forEach((idx) => (leds[idx].color = colorStr));
    colon2.forEach((idx) => (leds[idx].color = colorStr));

  } else if (currentMode === Mode.NORMAL) {
    // 1. Calculate clock displays
    let displayHour = currentHour;
    if (use12h) {
      const h = currentHour % 12;
      displayHour = h === 0 ? 12 : h;
    }

    const hTens = displayHour < 10 ? -1 : Math.floor(displayHour / 10);
    const hOnes = displayHour % 10;
    const mTens = Math.floor(currentMinute / 10);
    const mOnes = currentMinute % 10;
    const sTens = Math.floor(currentSecond / 10);
    const sOnes = currentSecond % 10;

    // Blink digits if editing them
    const showHrDigits = !isManualSetHours || blinkState;
    const showMinDigits = !isManualSetMinutes || blinkState;

    drawDigitToLeds(0, showHrDigits ? hTens : -1, 4);
    drawDigitToLeds(1, showHrDigits ? hOnes : -1, 4);
    drawDigitToLeds(2, showMinDigits ? mTens : -1, 4);
    drawDigitToLeds(3, showMinDigits ? mOnes : -1, 4);
    drawDigitToLeds(4, sTens, 3);
    drawDigitToLeds(5, sOnes, 3);

    // Colons breathe smoothly based on sine wave
    const angle = (millis % 1000) * ((2.0 * Math.PI) / 500.0);
    let breatheFactor = Math.floor((Math.sin(angle) + 1.0) * 127.5);

    // If GPS is disconnected, blink instead of breathing
    if (!gpsSignal) {
      breatheFactor = blinkState ? 255 : 30;
    }

    const applyColonBreathe = (idx: number) => {
      if (colorIndex === 7) {
        const pixelHue = (baseHue + idx * 3) & 255;
        const rgb = getWheelColor(pixelHue);
        leds[idx].color = rgbToHexStr(rgb.r, rgb.g, rgb.b, breatheFactor);
      } else {
        const hex = PRESET_COLORS_HEX[colorIndex];
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        leds[idx].color = rgbToHexStr(r, g, b, breatheFactor);
      }
    };

    colon1.forEach(applyColonBreathe);
    colon2.forEach(applyColonBreathe);

  } else if (currentMode === Mode.SHOW_TEMP) {
    // Shows integer temp: e.g. "25" ° C
    const tInt = Math.floor(externalTemp);
    const tTens = tInt < 10 ? -1 : Math.floor(tInt / 10);
    const tOnes = tInt % 10;

    drawDigitToLeds(0, tTens, 4);
    drawDigitToLeds(1, tOnes, 4);
    drawDigitToLeds(2, 12, 4); // ° symbol
    drawDigitToLeds(3, 13, 4); // C symbol
    drawDigitToLeds(4, -1, 3); // blank
    drawDigitToLeds(5, -1, 3); // blank

    // Colons are off in temperature display
    colon1.forEach((idx) => (leds[idx].color = "#000000"));
    colon2.forEach((idx) => (leds[idx].color = "#000000"));

  } else if (currentMode === Mode.SHOW_12_24) {
    // Shows format e.g. "00 12 00" or "00 24 00"
    drawDigitToLeds(0, 0, 4);
    drawDigitToLeds(1, 0, 4);
    drawDigitToLeds(2, use12h ? 1 : 2, 4);
    drawDigitToLeds(3, use12h ? 2 : 4, 4);
    drawDigitToLeds(4, 0, 3);
    drawDigitToLeds(5, 0, 3);

    // Colons low lit
    const lowBright = 50;
    const applyColonLow = (idx: number) => {
      if (colorIndex === 7) {
        const rgb = getWheelColor((baseHue + idx * 3) & 255);
        leds[idx].color = rgbToHexStr(rgb.r, rgb.g, rgb.b, lowBright);
      } else {
        const hex = PRESET_COLORS_HEX[colorIndex];
        const r = (hex >> 16) & 0xff;
        const g = (hex >> 8) & 0xff;
        const b = hex & 0xff;
        leds[idx].color = rgbToHexStr(r, g, b, lowBright);
      }
    };
    colon1.forEach(applyColonLow);
    colon2.forEach(applyColonLow);

  } else if (currentMode === Mode.SHOW_BRIGHTNESS) {
    // Shows percentage of brightness: e.g. 50
    const percent = Math.round((currentBrightness * 100) / 255);

    if (percent >= 100) {
      drawDigitToLeds(0, 1, 4);
      drawDigitToLeds(1, 0, 4);
      drawDigitToLeds(2, 0, 4);
      drawDigitToLeds(3, -1, 4);
    } else if (percent >= 10) {
      drawDigitToLeds(0, Math.floor(percent / 10), 4);
      drawDigitToLeds(1, percent % 10, 4);
      drawDigitToLeds(2, -1, 4);
      drawDigitToLeds(3, -1, 4);
    } else {
      drawDigitToLeds(0, -1, 4);
      drawDigitToLeds(1, percent, 4);
      drawDigitToLeds(2, -1, 4);
      drawDigitToLeds(3, -1, 4);
    }
    drawDigitToLeds(4, -1, 3);
    drawDigitToLeds(5, -1, 3);

    // Colons off
    colon1.forEach((idx) => (leds[idx].color = "#000000"));
    colon2.forEach((idx) => (leds[idx].color = "#000000"));
  }

  // --- INTERACTIVE BUTTON PRESSES ---

  // Button 1: BTN_COLOR (Pin 2) - Cycles through colors
  const handleColorButton = () => {
    sound.playClick();
    setBtnColorPressed(true);
    setTimeout(() => setBtnColorPressed(false), 200);

    if (currentMode === Mode.SHOW_12_24 || currentMode === Mode.SHOW_BRIGHTNESS || currentMode === Mode.WAIT_GPS) {
      addLog("[BUTTON] BTN_COLOR blocked during config/waiting mode.", "warning");
      return;
    }

    const nextIndex = (colorIndex + 1) % (PRESET_COLORS_HEX.length + 1);
    setColorIndex(nextIndex);
    addLog(`[EEPROM] Saving Color Index: ${nextIndex} (${COLOR_NAMES[nextIndex]}) at Addr 0x01`, "eeprom");
    addLog(`[COLOR] Selected Theme: ${COLOR_NAMES[nextIndex]}`, "button");
  };

  // Direct palette click
  const selectPaletteColor = (idx: number) => {
    sound.playSuccess();
    if (currentMode === Mode.SHOW_12_24 || currentMode === Mode.SHOW_BRIGHTNESS || currentMode === Mode.WAIT_GPS) {
      addLog("[PALETTE] Color change blocked during config/waiting mode.", "warning");
      return;
    }
    setColorIndex(idx);
    addLog(`[EEPROM] Direct palette save Color Index: ${idx} (${COLOR_NAMES[idx]}) at Addr 0x01`, "eeprom");
    addLog(`[COLOR] Selected Theme: ${COLOR_NAMES[idx]}`, "button");
  };

  // Button 2: BTN_1224 (Pin 3) - Toggle 12/24 hour display format
  const handle1224Button = () => {
    sound.playClick();
    setBtn1224Pressed(true);
    setTimeout(() => setBtn1224Pressed(false), 200);

    if (currentMode === Mode.SHOW_BRIGHTNESS || currentMode === Mode.WAIT_GPS) {
      addLog("[BUTTON] BTN_1224 blocked during brightness/waiting mode.", "warning");
      return;
    }

    const nextFormat = !use12h;
    setUse12h(nextFormat);

    // Enter transient 12/24 display
    if (currentMode !== Mode.SHOW_12_24) {
      setPreviousMode(currentMode);
    }
    setCurrentMode(Mode.SHOW_12_24);

    addLog(`[EEPROM] Saving format mode ${nextFormat ? "12-Hour" : "24-Hour"} at Addr 0x00`, "eeprom");
    addLog(`[FORMAT] Toggled format to: ${nextFormat ? "12-Hour Mode" : "24-Hour Mode"}`, "button");
  };

  // Button 3: BTN_BRIGHTNESS (Pin 5) - Cycles brightness
  const handleBrightnessButton = () => {
    sound.playClick();
    setBtnBrightnessPressed(true);
    setTimeout(() => setBtnBrightnessPressed(false), 200);

    if (currentMode === Mode.SHOW_12_24 || currentMode === Mode.WAIT_GPS) {
      addLog("[BUTTON] BTN_BRIGHTNESS blocked during config/waiting mode.", "warning");
      return;
    }

    // Step brightness (13 is ~5% of 255)
    let nextBrightness = currentBrightness + 13;
    if (nextBrightness > 255) {
      nextBrightness = 13; // Reset to 5% min
    }
    setCurrentBrightness(nextBrightness);

    // Enter transient brightness screen
    if (currentMode !== Mode.SHOW_BRIGHTNESS) {
      setPreviousMode(currentMode);
    }
    setCurrentMode(Mode.SHOW_BRIGHTNESS);

    addLog(`[EEPROM] Saving Brightness byte: 0x${nextBrightness.toString(16).toUpperCase()} (${nextBrightness}) at Addr 0x02`, "eeprom");
    addLog(`[BRIGHTNESS] Adjusting LED duty cycle... Brightness: ${Math.round((nextBrightness * 100) / 255)}%`, "button");
  };

  // --- EXTRA INTERACTIVE BUTTONS FROM PREVIEW IMAGE MOCK ---

  // MODE button - Triggers manual settings mode (Hours -> Minutes -> Exits)
  const handleModeButton = () => {
    sound.playClick();
    setBtnModePressed(true);
    setTimeout(() => setBtnModePressed(false), 200);

    if (currentMode === Mode.WAIT_GPS) {
      // Force GPS Sync instead of waiting
      setCurrentMode(Mode.NORMAL);
      setGpsTimeReceived(true);
      addLog("[MANUAL] MODE pressed during GPS WAIT. Bypassing satellite sync!", "button");
      return;
    }

    if (!isManualSetHours && !isManualSetMinutes) {
      setIsManualSetHours(true);
      addLog("[MODE] Entering MANUAL ADJUST mode. Set HOURS first. (Blinking digits)", "button");
    } else if (isManualSetHours) {
      setIsManualSetHours(false);
      setIsManualSetMinutes(true);
      addLog("[MODE] Set MINUTES next. (Blinking digits)", "button");
    } else {
      setIsManualSetMinutes(false);
      addLog("[MODE] Manual adjustment completed! Time saved to internal RTC register.", "button");
      sound.playSuccess();
    }
  };

  // UP Button - Increments hours/minutes depending on active manual mode
  const handleUpButton = () => {
    sound.playClick();
    setBtnUpPressed(true);
    setTimeout(() => setBtnUpPressed(false), 200);

    if (isManualSetHours) {
      setCurrentHour((prev) => (prev + 1) % 24);
      addLog("[MANUAL] Incremented current hours.", "button");
    } else if (isManualSetMinutes) {
      setCurrentMinute((prev) => (prev + 1) % 60);
      addLog("[MANUAL] Incremented current minutes.", "button");
    } else {
      // If not in edit mode, manual trigger temp query
      setPreviousMode(currentMode);
      setCurrentMode(Mode.SHOW_TEMP);
      addLog("[MANUAL] Triggered instant temperature sensor sweep.", "temp");
    }
  };

  // DOWN Button - Decrements hours/minutes
  const handleDownButton = () => {
    sound.playClick();
    setBtnDownPressed(true);
    setTimeout(() => setBtnDownPressed(false), 200);

    if (isManualSetHours) {
      setCurrentHour((prev) => (prev - 1 + 24) % 24);
      addLog("[MANUAL] Decremented current hours.", "button");
    } else if (isManualSetMinutes) {
      setCurrentMinute((prev) => (prev - 1 + 60) % 60);
      addLog("[MANUAL] Decremented current minutes.", "button");
    } else {
      // If not in edit mode, toggle GPS connection
      toggleGpsSignal();
    }
  };

  // Handle live Phone GPS syncing
  const syncWithPhoneGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser/device.");
      addLog("Phone GPS: Geolocation is not supported.", "warning");
      return;
    }

    sound.playClick();
    setGpsSyncing(true);
    setGpsError(null);
    addLog("Phone GPS: Requesting satellite sync from device Geolocation API...", "info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Use the actual device GPS/Network timestamp
        const deviceTime = new Date(position.timestamp);
        
        setCurrentHour(deviceTime.getHours());
        setCurrentMinute(deviceTime.getMinutes());
        setCurrentSecond(deviceTime.getSeconds());
        setCurrentDay(deviceTime.getDate());
        setCurrentMonth(deviceTime.getMonth() + 1);
        setCurrentYear(deviceTime.getFullYear());

        setGpsSignal(true);
        setGpsTimeReceived(true);
        setLastGPSDataTime(Date.now());

        setRealGpsData({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          syncTime: deviceTime.toLocaleTimeString(),
        });

        setGpsSyncing(false);
        sound.playSuccess();
        
        // Feed NMEA sentence with real coordinates for realism
        const hStr = String(deviceTime.getHours()).padStart(2, "0");
        const mStr = String(deviceTime.getMinutes()).padStart(2, "0");
        const sStr = String(deviceTime.getSeconds()).padStart(2, "0");
        const dayStr = String(deviceTime.getDate()).padStart(2, "0");
        const monStr = String(deviceTime.getMonth() + 1).padStart(2, "0");
        const yrStr = String(deviceTime.getFullYear()).slice(-2);
        
        // Mocking NMEA sequence but using actual lat/lng values
        const nLat = Math.abs(position.coords.latitude);
        const nLng = Math.abs(position.coords.longitude);
        const latDir = position.coords.latitude >= 0 ? "N" : "S";
        const lngDir = position.coords.longitude >= 0 ? "E" : "W";
        
        addLog(`$GPRMC,${hStr}${mStr}${sStr}.00,A,${nLat.toFixed(4)},${latDir},${nLng.toFixed(4)},${lngDir},000.0,000.0,${dayStr}${monStr}${yrStr},,,A*5B`, "gps");
        addLog(`[GPS] Phone GPS locked. Coordinates: ${position.coords.latitude.toFixed(5)}°, ${position.coords.longitude.toFixed(5)}°`, "gps");
        addLog(`[GPS] Internal RTC adjusted: ${hStr}:${mStr}:${sStr} | ${dayStr}/${monStr}/${deviceTime.getFullYear()}`, "gps");

        if (currentMode === Mode.WAIT_GPS) {
          setCurrentMode(Mode.NORMAL);
          addLog("[GPS] Satellite lock acquired. Switched to NORMAL clock mode.", "info");
        }
      },
      (err) => {
        setGpsSyncing(false);
        let errMsg = "Unable to acquire location coordinates.";
        if (err.code === err.PERMISSION_DENIED) {
          errMsg = "GPS permission denied. Please enable Geolocation in your browser/device settings.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errMsg = "Location info unavailable. Ensure your GPS sensor is enabled.";
        } else if (err.code === err.TIMEOUT) {
          errMsg = "GPS positioning timed out. Please try again.";
        }
        setGpsError(errMsg);
        addLog(`Phone GPS Sync Failed: ${errMsg}`, "warning");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Handle manual GPS NMEA feeding
  const triggerManualGpsFeed = () => {
    sound.playSuccess();
    setGpsSignal(true);
    setGpsTimeReceived(true);
    setLastGPSDataTime(Date.now());
    
    // Simulate real NMEA $GPRMC character stream
    const hStr = String(currentHour).padStart(2, "0");
    const mStr = String(currentMinute).padStart(2, "0");
    const sStr = String(currentSecond).padStart(2, "0");
    const dayStr = String(currentDay).padStart(2, "0");
    const monStr = String(currentMonth).padStart(2, "0");
    const yrStr = String(currentYear).slice(-2);

    addLog(`$GPRMC,${hStr}${mStr}${sStr}.00,A,2836.12,N,07713.44,E,000.0,000.0,${dayStr}${monStr}${yrStr},,,A*6F`, "gps");
    addLog("[GPS] Valid $GPRMC character stream received in SoftwareSerial buffer.", "gps");
    addLog(`[GPS] Parsing GPS Time: ${hStr}:${mStr}:${sStr} | Date: ${dayStr}/${monStr}/${currentYear}`, "gps");

    if (currentMode === Mode.WAIT_GPS) {
      setCurrentMode(Mode.NORMAL);
      addLog("[GPS] GPS Lock acquired. Switching from WAIT_GPS to NORMAL mode.", "info");
    }
  };

  const toggleGpsSignal = () => {
    sound.playClick();
    const nextVal = !gpsSignal;
    setGpsSignal(nextVal);
    if (!nextVal) {
      addLog("[GPS] NEO-6M Serial Connection Interrupted (No GPS Satellites visible)", "warning");
    } else {
      addLog("[GPS] NEO-6M Serial Connection re-established. Syncing...", "gps");
      triggerManualGpsFeed();
    }
  };

  // Command Input from virtual Serial terminal
  const handleSendCommand = (cmd: string) => {
    addLog(`$ ${cmd}`, "info");
    const lower = cmd.trim().toLowerCase();

    if (lower === "help") {
      addLog("Available commands:", "info");
      addLog("  help                 - Show this help log", "info");
      addLog("  btn_color            - Simulate pressing color cycle button", "info");
      addLog("  btn_1224             - Simulate toggling 12H/24H format", "info");
      addLog("  btn_brightness       - Simulate cycling LED brightness", "info");
      addLog("  set_temp <val>       - Set custom temperature (e.g. set_temp 32.4)", "info");
      addLog("  gps_sync             - Trigger NMEA GPS sentence feed", "info");
      addLog("  gps_disconnect       - Disconnect virtual GPS antenna", "info");
      addLog("  eeprom_dump          - Dump address registers in HEX", "info");
      addLog("  clear                - Clear monitor terminal", "info");
    } else if (lower === "btn_color") {
      handleColorButton();
    } else if (lower === "btn_1224") {
      handle1224Button();
    } else if (lower === "btn_brightness") {
      handleBrightnessButton();
    } else if (lower === "gps_sync") {
      triggerManualGpsFeed();
    } else if (lower === "gps_disconnect") {
      setGpsSignal(false);
      addLog("[GPS] GPS signal disconnected via console.", "warning");
    } else if (lower === "clear") {
      setLogs([]);
    } else if (lower === "eeprom_dump") {
      addLog("EEPROM DUMP [Addresses 0x00 - 0x10]:", "eeprom");
      addLog(`  0x00: 0x0${use12h ? 1 : 0} (Format Configuration Mode)`, "eeprom");
      addLog(`  0x01: 0x0${colorIndex} (Preset Color Array Index)`, "eeprom");
      addLog(`  0x02: 0x${currentBrightness.toString(16).toUpperCase().padStart(2, "0")} (Brightness Scale Byte)`, "eeprom");
      addLog("  0x03 - 0x10: 0xFF (Unassigned segment bytes)", "eeprom");
    } else if (lower.startsWith("set_temp ")) {
      const valStr = lower.substring(9).trim();
      const val = parseFloat(valStr);
      if (!isNaN(val)) {
        setExternalTemp(val);
        addLog(`[DS18B20] Sensor simulation set to: ${val.toFixed(2)}°C`, "temp");
        sound.playSuccess();
      } else {
        addLog("Invalid temperature value. Usage: set_temp 24.5", "warning");
      }
    } else if (lower.startsWith("$gprmc")) {
      addLog("[NMEA] Input sentence detected. Syncing serial clock...", "gps");
      triggerManualGpsFeed();
    } else {
      addLog(`Unknown serial command: '${cmd}'. Type 'help' for support.`, "warning");
    }
  };

  // --- GET BADGE / STATUS TEXT FOR THE MOCK BADGE ---
  const getBadgeStatusText = () => {
    if (currentMode === Mode.WAIT_GPS) return "WAIT GPS";
    if (isManualSetHours) return "SET HOUR";
    if (isManualSetMinutes) return "SET MIN";
    if (currentMode === Mode.SHOW_TEMP) return "TEMP DISPLAY";
    if (currentMode === Mode.SHOW_BRIGHTNESS) return "SET BRIGHTNESS";
    if (currentMode === Mode.SHOW_12_24) return "FORMAT SCREEN";
    return `CLOCK ${use12h ? "12H" : "24H"}`;
  };

  const getBadgeStatusClass = () => {
    if (currentMode === Mode.WAIT_GPS) return "bg-amber-500/10 text-amber-400 border-amber-800/30 animate-pulse";
    if (isManualSetHours || isManualSetMinutes) return "bg-purple-500/10 text-purple-400 border-purple-800/30";
    if (currentMode === Mode.SHOW_TEMP) return "bg-emerald-500/10 text-emerald-400 border-emerald-800/30";
    if (currentMode === Mode.SHOW_BRIGHTNESS) return "bg-indigo-500/10 text-indigo-400 border-indigo-800/30";
    return "bg-cyan-500/10 text-cyan-400 border-cyan-800/30";
  };

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-indigo-600 selection:text-white">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/15 blur-[120px] pointer-events-none" />

      {/* Top Professional Header Bar */}
      <header className="bg-slate-950/80 border-b border-slate-900 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-cyan-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-cyan-950/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight font-sans">
              NEO-6M NeoPixel GPS Clock Simulator
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Full-Stack Hardware Emulator & EEPROM Sandbox
            </p>
          </div>
        </div>

        {/* Audio and Quick action switches */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSoundOn(!soundOn);
              sound.enabled = !soundOn;
              sound.playClick();
            }}
            className={`p-2 rounded-lg border transition-all ${
              soundOn
                ? "bg-indigo-950/30 border-indigo-800/40 text-indigo-400 hover:bg-indigo-950/50"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"
            }`}
            title={soundOn ? "Mute simulator sounds" : "Unmute simulator sounds"}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              // Reset all states
              setCurrentHour(10);
              setCurrentMinute(23);
              setCurrentSecond(20);
              setColorIndex(7);
              setCurrentBrightness(128);
              setUse12h(true);
              setGpsSignal(true);
              setGpsTimeReceived(true);
              setExternalTemp(25.5);
              setIsManualSetHours(false);
              setIsManualSetMinutes(false);
              setCurrentMode(Mode.NORMAL);
              sound.playSuccess();
              addLog("[SYSTEM] Simulator reset to factory default firmware parameters.", "warning");
            }}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all font-mono text-xs flex items-center gap-1.5"
            title="Factory Reset Arduino settings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Code</span>
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left/Middle Column (Lg: Col-span 7) - The Physical Hardware Clock Visualizer & Tactile Controls */}
        <section className="lg:col-span-7 flex flex-col gap-6 justify-center">
          
          {/* Main Bezel Display Housing (Reproduces mockup image layout perfectly) */}
          <div className="bg-slate-950 rounded-[2.5rem] border border-slate-850 p-6 sm:p-8 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden ring-1 ring-slate-800/50">
            {/* Screen Glass Reflection */}
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-t-[2.5rem]" />
            
            {/* Fine accent borders */}
            <div className="absolute inset-2 border border-slate-900 rounded-[2rem] pointer-events-none" />

            {/* Simulated Acrylic LED Bezel Card */}
            <div className="w-full bg-[#030409] border border-slate-900 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center gap-6 relative min-h-[220px]">
              
              {/* Top Row: HH:MM:SS segments */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 relative">
                {/* Digit 0: Hour tens */}
                <DigitDisplay
                  digitIndex={0}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? Math.floor(externalTemp) < 10 ? -1 : Math.floor(externalTemp / 10)
                      : currentMode === Mode.SHOW_12_24
                      ? 0
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? Math.round((currentBrightness * 100) / 255) >= 100 ? 1 : Math.round((currentBrightness * 100) / 255) < 10 ? -1 : Math.floor(Math.round((currentBrightness * 100) / 255) / 10)
                      : (isManualSetHours && !blinkState) ? -1 : (currentHour === 0 ? 12 : (use12h ? (currentHour % 12 === 0 ? 12 : currentHour % 12) : currentHour)) < 10 ? -1 : Math.floor((use12h ? (currentHour % 12 === 0 ? 12 : currentHour % 12) : currentHour) / 10)
                  }
                  baseLedIndex={0}
                  segLEDsCount={4}
                  leds={leds}
                  isHoursOrMinutes={true}
                />
                
                {/* Digit 1: Hour ones */}
                <DigitDisplay
                  digitIndex={1}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? Math.floor(externalTemp) % 10
                      : currentMode === Mode.SHOW_12_24
                      ? 0
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? Math.round((currentBrightness * 100) / 255) >= 100 ? 0 : Math.round((currentBrightness * 100) / 255) % 10
                      : (isManualSetHours && !blinkState) ? -1 : (use12h ? (currentHour % 12 === 0 ? 12 : currentHour % 12) : currentHour) % 10
                  }
                  baseLedIndex={28}
                  segLEDsCount={4}
                  leds={leds}
                  isHoursOrMinutes={true}
                />

                {/* Colon 1 (2 LEDs) */}
                <div className="flex flex-col justify-around h-14 sm:h-20 py-2.5 px-0.5 select-none">
                  {[56, 57].map((ledIdx) => {
                    const isOff = leds[ledIdx].color === "#000000";
                    return (
                      <div
                        key={ledIdx}
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-150"
                        style={{
                          backgroundColor: isOff ? "#1e293b" : leds[ledIdx].color,
                          boxShadow: isOff ? "none" : `0 0 12px ${leds[ledIdx].color}, 0 0 4px ${leds[ledIdx].color} inset`,
                          border: `1px solid ${isOff ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.2)"}`
                        }}
                      />
                    );
                  })}
                </div>

                {/* Digit 2: Minute tens */}
                <DigitDisplay
                  digitIndex={2}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? 12 // °
                      : currentMode === Mode.SHOW_12_24
                      ? use12h ? 1 : 2
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? Math.round((currentBrightness * 100) / 255) >= 100 ? 0 : -1
                      : (isManualSetMinutes && !blinkState) ? -1 : Math.floor(currentMinute / 10)
                  }
                  baseLedIndex={58}
                  segLEDsCount={4}
                  leds={leds}
                  isHoursOrMinutes={true}
                />

                {/* Digit 3: Minute ones */}
                <DigitDisplay
                  digitIndex={3}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? 13 // C
                      : currentMode === Mode.SHOW_12_24
                      ? use12h ? 2 : 4
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? -1
                      : (isManualSetMinutes && !blinkState) ? -1 : currentMinute % 10
                  }
                  baseLedIndex={86}
                  segLEDsCount={4}
                  leds={leds}
                  isHoursOrMinutes={true}
                />

                {/* Colon 2 (2 LEDs) */}
                <div className="flex flex-col justify-around h-14 sm:h-20 py-2.5 px-0.5 select-none">
                  {[114, 115].map((ledIdx) => {
                    const isOff = leds[ledIdx].color === "#000000";
                    return (
                      <div
                        key={ledIdx}
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-150"
                        style={{
                          backgroundColor: isOff ? "#1e293b" : leds[ledIdx].color,
                          boxShadow: isOff ? "none" : `0 0 12px ${leds[ledIdx].color}, 0 0 4px ${leds[ledIdx].color} inset`,
                          border: `1px solid ${isOff ? "rgba(30, 41, 59, 0.5)" : "rgba(255, 255, 255, 0.2)"}`
                        }}
                      />
                    );
                  })}
                </div>

                {/* Digit 4: Second tens */}
                <DigitDisplay
                  digitIndex={4}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? -1
                      : currentMode === Mode.SHOW_12_24
                      ? 0
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? -1
                      : Math.floor(currentSecond / 10)
                  }
                  baseLedIndex={116}
                  segLEDsCount={3}
                  leds={leds}
                  isHoursOrMinutes={false}
                />

                {/* Digit 5: Second ones */}
                <DigitDisplay
                  digitIndex={5}
                  value={
                    currentMode === Mode.WAIT_GPS
                      ? -1
                      : currentMode === Mode.SHOW_TEMP
                      ? -1
                      : currentMode === Mode.SHOW_12_24
                      ? 0
                      : currentMode === Mode.SHOW_BRIGHTNESS
                      ? -1
                      : currentSecond % 10
                  }
                  baseLedIndex={137}
                  segLEDsCount={3}
                  leds={leds}
                  isHoursOrMinutes={false}
                />
              </div>

              {/* Bottom Display Row: Date "DD.MM.YY" using sleek glowing cyan segments */}
              <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-950/60 border border-slate-900/60 font-mono text-cyan-400 font-bold select-none text-base sm:text-xl tracking-widest shadow-inner relative">
                {/* Visual pulse indicator of clock ticking */}
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${blinkState ? "bg-cyan-400 shadow-[0_0_6px_#22d3ee]" : "bg-cyan-900/30"} transition-all`} />
                <span>
                  {currentMode === Mode.WAIT_GPS ? (
                    <span className="animate-pulse text-amber-500 font-bold">WAITING ON GPS SIGNAL</span>
                  ) : currentMode === Mode.SHOW_TEMP ? (
                    <span className="text-emerald-400">TEMPERATURE ACTIVE</span>
                  ) : (
                    <span>
                      {String(currentDay).padStart(2, "0")}.
                      {String(currentMonth).padStart(2, "0")}.
                      {String(currentYear).substring(2)}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Badge pill showing active format / status (matches mockup exactly) */}
            <div className="mt-5">
              <div className={`border rounded-full px-4 py-1 text-[11px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 ${getBadgeStatusClass()}`}>
                <Clock className="w-3 h-3" />
                <span>{getBadgeStatusText()}</span>
              </div>
            </div>
          </div>

          {/* Controller Tactile Buttons Row (Recreates the style in the mockup image) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            
            {/* MODE / SET CLOCK BUTTON (Pin D2 trigger wrapper) */}
            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <button
                onClick={handleModeButton}
                className={`relative overflow-hidden h-16 w-full rounded-2xl border text-left px-4 py-3 transition-all ${
                  isManualSetHours || isManualSetMinutes
                    ? "bg-purple-950/30 border-purple-500 text-purple-300 shadow-lg shadow-purple-950/30"
                    : btnModePressed
                    ? "bg-slate-800 scale-[0.98] border-slate-700"
                    : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-[10px] font-bold text-slate-500 tracking-wider font-mono uppercase">MODE</div>
                <div className="text-xs font-bold font-sans mt-0.5">
                  {isManualSetHours ? "Editing Hours..." : isManualSetMinutes ? "Editing Mins..." : "Set Clock"}
                </div>
                {/* Mini blinking status LED */}
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${isManualSetHours || isManualSetMinutes ? "bg-purple-400 animate-ping" : "bg-slate-800"}`} />
              </button>
            </div>

            {/* UP & DOWN adjusters */}
            <div className="sm:col-span-4 flex gap-2">
              <button
                onClick={handleUpButton}
                className={`flex-1 h-16 rounded-2xl bg-slate-950 hover:bg-slate-900 border transition-all flex flex-col items-center justify-center ${
                  btnUpPressed ? "border-slate-500 scale-[0.97] bg-slate-900" : "border-slate-800 hover:border-slate-700"
                }`}
                title="Increment Time Value / Trigger Sweep"
              >
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-100" />
                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wide mt-1">UP</span>
              </button>

              <button
                onClick={handleDownButton}
                className={`flex-1 h-16 rounded-2xl bg-slate-950 hover:bg-slate-900 border transition-all flex flex-col items-center justify-center ${
                  btnDownPressed ? "border-slate-500 scale-[0.97] bg-slate-900" : "border-slate-800 hover:border-slate-700"
                }`}
                title="Decrement Time Value / Connect GPS"
              >
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-100" />
                <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wide mt-1">DOWN</span>
              </button>
            </div>

            {/* 12H/24H TOGGLE BUTTON (Pin D3 trigger wrapper) */}
            <div className="sm:col-span-4">
              <button
                onClick={handle1224Button}
                className={`h-16 w-full rounded-2xl border text-left px-4 py-3 transition-all relative ${
                  currentMode === Mode.SHOW_12_24
                    ? "bg-cyan-950/20 border-cyan-500 text-cyan-300 shadow-lg shadow-cyan-950/20"
                    : btn1224Pressed
                    ? "bg-slate-800 scale-[0.98] border-slate-700"
                    : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-[10px] font-bold text-slate-500 tracking-wider font-mono uppercase">FORMAT</div>
                <div className="text-xs font-bold font-sans mt-0.5">
                  {use12h ? "12-Hour Active" : "24-Hour Active"}
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2 w-2 relative">
                  <span className={`inline-flex rounded-full h-2 w-2 ${use12h ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-cyan-800"}`}></span>
                </div>
              </button>
            </div>
          </div>

          {/* Color circular palette selection & Hardware Button Row (Mimicking mockup exactly) */}
          <div className="bg-slate-950 border border-slate-850 p-4 sm:p-5 rounded-3xl flex flex-col gap-4">
            
            {/* Color section header */}
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400 tracking-wider font-mono uppercase">
                COLOR SELECTION PALETTE
              </div>
              <div className="text-[10px] font-semibold font-mono text-indigo-400">
                Mode: {COLOR_NAMES[colorIndex]}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-2xl border border-slate-900/40">
              
              {/* Preset buttons */}
              <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto py-1 scrollbar-none">
                {COLOR_NAMES.map((colName, idx) => {
                  const active = colorIndex === idx;
                  const isRainbow = idx === 7;

                  return (
                    <button
                      key={colName}
                      onClick={() => selectPaletteColor(idx)}
                      className={`w-9 h-9 rounded-full relative transition-all flex items-center justify-center ${
                        active
                          ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                          : "hover:scale-105"
                      }`}
                      style={{
                        background: isRainbow
                          ? "linear-gradient(to right, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7)"
                          : rgbToHexStr(
                              (PRESET_COLORS_HEX[idx] >> 16) & 0xff,
                              (PRESET_COLORS_HEX[idx] >> 8) & 0xff,
                              PRESET_COLORS_HEX[idx] & 0xff,
                              255
                            ),
                        boxShadow: active
                          ? `0 0 15px ${
                              isRainbow
                                ? "#a855f7"
                                : rgbToHexStr(
                                    (PRESET_COLORS_HEX[idx] >> 16) & 0xff,
                                    (PRESET_COLORS_HEX[idx] >> 8) & 0xff,
                                    PRESET_COLORS_HEX[idx] & 0xff,
                                    255
                                  )
                            }`
                          : "none",
                      }}
                      title={`Select ${colName} theme`}
                    >
                      {active && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md border border-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Physical COLOR hardware button Pin 2 */}
              <button
                onClick={handleColorButton}
                className={`h-11 px-4 rounded-xl border text-xs font-mono font-bold tracking-wide transition-all ${
                  btnColorPressed
                    ? "bg-slate-800 scale-95 border-slate-700"
                    : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-indigo-400"
                }`}
                title="Physically cycle colors via D2 pin interrupts"
              >
                BTN_COLOR (D2)
              </button>
            </div>
            
            {/* Brightness Hardware Pin 5 Button Row */}
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider font-mono uppercase">
                BRIGHTNESS LEVEL CONTROL
              </span>
              <button
                onClick={handleBrightnessButton}
                className={`h-11 px-4 rounded-xl border text-xs font-mono font-bold tracking-wide transition-all ${
                  btnBrightnessPressed
                    ? "bg-slate-800 scale-95 border-slate-700"
                    : "bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300 hover:text-indigo-400"
                }`}
                title="Cycle brightness levels via D5 pin interrupts"
              >
                BTN_BRIGHTNESS (D5)
              </button>
            </div>
          </div>
        </section>

        {/* Right Column (Lg: Col-span 5) - Pin Diagnoses and 158 NeoPixel strip view */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Bento navigation Tabs for developer utility */}
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-900 gap-1">
            {[
              { id: "controls", label: "Sensors & Pins", icon: Cpu },
              { id: "pixels", label: "158 Strip view", icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id as any);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white font-bold shadow-md"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab rendering container */}
          <div className="flex-1 min-h-[480px]">
            {activeTab === "controls" && (
              <HardwareControls
                gpsSignal={gpsSignal}
                onGpsSignalToggle={toggleGpsSignal}
                gpsTimeReceived={gpsTimeReceived}
                externalTemp={externalTemp}
                onTempChange={(val) => {
                  setExternalTemp(val);
                  addLog(`[DS18B20] Ambient temperature updated dynamically to ${val.toFixed(1)}°C`, "temp");
                }}
                btnColorPressed={btnColorPressed}
                btn1224Pressed={btn1224Pressed}
                btnBrightnessPressed={btnBrightnessPressed}
                eepromMode12={use12h}
                eepromColorIndex={colorIndex}
                eepromBrightness={currentBrightness}
                onGpsSyncTrigger={triggerManualGpsFeed}
                onPhoneGpsSync={syncWithPhoneGps}
                gpsSyncing={gpsSyncing}
                gpsError={gpsError}
                realGpsData={realGpsData}
              />
            )}

            {activeTab === "pixels" && (
              <NeoPixelStrip
                leds={leds}
                currentBrightness={currentBrightness}
              />
            )}
          </div>
        </section>

      </main>

      {/* Footer Info credit */}
      <footer className="bg-slate-950/40 border-t border-slate-900/60 py-4 text-center mt-12 text-slate-500 text-[10px] font-mono z-10">
        <p>Arduino NeoPixel Hardware Clock Emulator v1.4.2 | Compiled for ATmega328P @ 16 MHz</p>
        <p className="mt-1">Designed with precision to match physical LED grids and GPS software-serial parsers.</p>
      </footer>
    </div>
  );
}
