/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import GameBoard from './components/GameBoard';
import { Shield, Sparkles, Terminal } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300" id="app_entry_container">
      {/* Top minimalistic navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 sm:px-6 py-4" id="app_navigation_header">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Glowing Icon */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <Terminal size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-black text-white tracking-widest font-sans flex items-center gap-1.5 uppercase leading-none">
                REVERSE SNAKE
                <span className="text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20 tracking-normal capitalize animate-pulse">
                  v1.0
                </span>
              </h1>
              <p className="text-[9px] sm:text-[11px] text-slate-400 font-mono font-bold tracking-wider uppercase mt-1 leading-none">
                CYBERNETIC DECOMPRESSION MODULE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 hidden sm:flex">
            <span className="flex items-center gap-1.5">
              <Shield size={12} className="text-emerald-400" /> SYSTEM OVERLOOK: STABLE
            </span>
            <span className="h-4 w-px bg-slate-800" />
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-cyan-400 animate-spin-slow" /> CORE ACTIVE
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 flex items-center justify-center" id="app_main_content">
        <GameBoard />
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs px-6 py-4 font-mono select-none" id="app_footer_bar">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>
            © 2026 REVERSE SNAKE SYSTEMS CORP. ALL SECURITY CORE PRIVILEGES COMPLIED.
          </span>
          <div className="flex gap-4">
            <span className="text-slate-400 font-sans">
              Developed inside Google AI Studio
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
