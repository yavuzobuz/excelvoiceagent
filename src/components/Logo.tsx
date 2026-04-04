import React from 'react';
import { FileSpreadsheet, Sparkles } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
        <FileSpreadsheet className="w-6 h-6 text-white" />
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
        </div>
      </div>
      <span className="text-xl font-bold tracking-tight text-slate-800">ExcelAI</span>
    </div>
  );
}
