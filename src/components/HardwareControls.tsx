/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Cpu, Thermometer, Radio, Database, HelpCircle, Smartphone } from "lucide-react";

interface HardwareControlsProps {
  gpsSignal: boolean;
  onGpsSignalToggle: () => void;
  gpsTimeReceived: boolean;
  externalTemp: number;
  onTempChange: (temp: number) => void;
  // Pin statuses (simulated)
  btnColorPressed: boolean;
  btn1224Pressed: boolean;
  btnBrightnessPressed: boolean;
  // EEPROM values
  eepromMode12: boolean;
  eepromColorIndex: number;
  eepromBrightness: number;
  // Manual GPS Feed trigger
  onGpsSyncTrigger: () => void;
  // Phone GPS integration
  onPhoneGpsSync: () => void;
  gpsSyncing: boolean;
  gpsError: string | null;
  realGpsData: {
    lat: number | null;
    lng: number | null;
    accuracy: number | null;
    altitude: number | null;
    syncTime: string | null;
  } | null;
}

export default function HardwareControls({
  gpsSignal,
  onGpsSignalToggle,
  gpsTimeReceived,
  externalTemp,
  onTempChange,
  btnColorPressed,
  btn1224Pressed,
  btnBrightnessPressed,
  eepromMode12,
  eepromColorIndex,
  eepromBrightness,
  onGpsSyncTrigger,
  onPhoneGpsSync,
  gpsSyncing,
  gpsError,
  realGpsData,
}: HardwareControlsProps) {
  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-5 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Cpu className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Hardware & Environment Controller</h3>
          <p className="text-[11px] text-slate-400 font-mono">Simulate real-time physical inputs</p>
        </div>
      </div>

      {/* Grid of controllers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* GPS Sensor Control */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
              <Radio className="w-4 h-4 text-cyan-400" />
              NEO-6M GPS Module
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${gpsSignal ? "bg-cyan-500/10 text-cyan-400" : "bg-rose-500/10 text-rose-400"}`}>
                {gpsSignal ? "FIX ACTIVE" : "NO SIGNAL"}
              </span>
              <button
                onClick={onGpsSignalToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${gpsSignal ? "bg-cyan-500" : "bg-slate-700"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${gpsSignal ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            The GPS receiver updates internal hour registers by acquiring satellite telemetry. You can sync the clock using your actual phone/device GPS.
          </p>

          <div className="mt-1 flex flex-col gap-2">
            <button
              onClick={onPhoneGpsSync}
              disabled={gpsSyncing}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 border shadow-sm ${
                gpsSyncing
                  ? "bg-cyan-950/40 border-cyan-800/40 text-cyan-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 hover:from-cyan-600/35 hover:to-indigo-600/35 text-cyan-300 border-cyan-500/30 active:scale-[0.98]"
              }`}
            >
              <Smartphone className={`w-3.5 h-3.5 ${gpsSyncing ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
              {gpsSyncing ? "ACQUIRING SATELLITE FIX..." : "SYNC WITH PHONE GPS"}
            </button>

            {realGpsData && (
              <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/60 font-mono text-[10px] text-slate-400 flex flex-col gap-1 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-800/40 pb-1 mb-1">
                  <span className="text-slate-500 text-[9px] uppercase tracking-wider font-semibold">Active Coordinates</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]"></span>
                </div>
                <div className="flex justify-between">
                  <span>LATITUDE: <span className="text-cyan-400 font-bold">{realGpsData.lat?.toFixed(6)}°</span></span>
                  <span>LONGITUDE: <span className="text-cyan-400 font-bold">{realGpsData.lng?.toFixed(6)}°</span></span>
                </div>
                <div className="flex justify-between">
                  <span>ACCURACY: <span className="text-cyan-400 font-bold">±{realGpsData.accuracy?.toFixed(1)}m</span></span>
                  {realGpsData.altitude !== null && (
                    <span>ALTITUDE: <span className="text-cyan-400 font-bold">{realGpsData.altitude?.toFixed(1)}m</span></span>
                  )}
                </div>
                <div className="text-[9px] text-slate-500 text-right mt-1 pt-1 border-t border-slate-800/20">
                  Synced: <span className="text-slate-400 font-sans">{realGpsData.syncTime}</span>
                </div>
              </div>
            )}

            {gpsError && (
              <div className="p-2 text-[10px] text-rose-400 bg-rose-950/25 border border-rose-900/30 rounded-lg font-sans">
                ⚠️ {gpsError}
              </div>
            )}

            <button
              onClick={onGpsSyncTrigger}
              className="w-full bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-850 hover:border-slate-700 hover:text-slate-200 transition-all py-1.5 rounded-lg text-[10px] font-semibold font-mono flex items-center justify-center gap-1.5"
            >
              Feed Mock NMEA $GPRMC
            </button>
            <div className="grid grid-cols-2 text-[9px] text-slate-500 font-mono mt-1">
              <div>Lock State: <span className={gpsTimeReceived ? "text-emerald-400" : "text-amber-400"}>{gpsTimeReceived ? "Locked" : "Searching..."}</span></div>
              <div className="text-right">Baud: <span>9600 bps</span></div>
            </div>
          </div>
        </div>

        {/* Temperature Sensor Control */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              DS18B20 Temp Sensor
            </span>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {externalTemp.toFixed(1)}°C
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            A one-wire temperature sensor on Pin 4. The system automatically reads it every 20 seconds to show it on the clock.
          </p>

          <div className="mt-3">
            <input
              type="range"
              min="-15"
              max="50"
              step="0.5"
              value={externalTemp}
              onChange={(e) => onTempChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
              <span>-15°C</span>
              <span>Freezing (0°C)</span>
              <span>Room (25°C)</span>
              <span>50°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid for Pins Diagnostic & EEPROM memory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Hardware Pin Inspector */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Microcontroller Pins (Arduino Nano/Uno)
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
            {[
              { pin: "D2", name: "BTN_COLOR", val: btnColorPressed ? "LOW (Pressed)" : "HIGH", active: btnColorPressed },
              { pin: "D3", name: "BTN_1224", val: btn1224Pressed ? "LOW (Pressed)" : "HIGH", active: btn1224Pressed },
              { pin: "D4", name: "ONE_WIRE", val: "DS18B20 Stream", active: false, pulse: true },
              { pin: "D5", name: "BTN_BRIGHT", val: btnBrightnessPressed ? "LOW (Pressed)" : "HIGH", active: btnBrightnessPressed },
              { pin: "D6", name: "LED_STRIP", val: "158 NeoPixels", active: true },
              { pin: "D8/9", name: "GPS_SERIAL", val: gpsSignal ? "RX/TX Active" : "No RX", active: gpsSignal, pulse: gpsSignal },
            ].map((p, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-1.5 rounded border border-slate-900 ${
                  p.active
                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                    : p.pulse
                    ? "bg-indigo-950/20 text-indigo-400 border-indigo-900/30"
                    : "bg-slate-900 text-slate-400 border-slate-850"
                }`}
              >
                <div className="flex gap-1.5 items-center">
                  <span className="font-bold opacity-80">{p.pin}</span>
                  <span className="text-[9px] text-slate-500">({p.name})</span>
                </div>
                <div className="flex items-center gap-1">
                  {p.pulse && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>}
                  <span className="text-[10px] font-bold">{p.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EEPROM Non-Volatile Memory */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
            <Database className="w-4 h-4 text-pink-400" />
            EEPROM Non-Volatile Memory
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
            The Arduino uses EEPROM storage to preserve state settings across hardware reboots and power cuts.
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono mt-1">
            <div className="bg-slate-900 border border-slate-850 p-2 rounded flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase">Addr 0x00</span>
              <span className="text-slate-300 font-semibold my-1">
                {eepromMode12 ? "0x01" : "0x00"}
              </span>
              <span className="text-[8px] text-pink-400 font-medium">
                {eepromMode12 ? "12H Mode" : "24H Mode"}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-2 rounded flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase">Addr 0x01</span>
              <span className="text-slate-300 font-semibold my-1">
                0x0{eepromColorIndex}
              </span>
              <span className="text-[8px] text-pink-400 font-medium">
                Color {eepromColorIndex}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-850 p-2 rounded flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 uppercase">Addr 0x02</span>
              <span className="text-slate-300 font-semibold my-1">
                0x{eepromBrightness.toString(16).toUpperCase().padStart(2, "0")}
              </span>
              <span className="text-[8px] text-pink-400 font-medium">
                Bright {eepromBrightness}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
