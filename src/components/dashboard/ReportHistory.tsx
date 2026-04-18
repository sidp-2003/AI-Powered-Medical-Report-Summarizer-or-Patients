'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, ArrowRight, BarChart2 } from 'lucide-react';

interface ReportHistoryProps {
  reports: any[];
  onSelectReport: (report: any) => void;
  onCompare: (reports: [any, any]) => void;
  onBack: () => void;
}

export default function ReportHistory({ reports, onSelectReport, onCompare, onBack }: ReportHistoryProps) {
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  const handleToggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(x => x !== id));
    } else {
      if (selectedForCompare.length < 2) {
        setSelectedForCompare(prev => [...prev, id]);
      }
    }
  };

  const handleCompareClick = () => {
    if (selectedForCompare.length === 2) {
      const r1 = reports.find(r => r.id === selectedForCompare[0]);
      const r2 = reports.find(r => r.id === selectedForCompare[1]);
      if (r1 && r2) onCompare([r1, r2]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-8">
      <div className="flex items-center justify-between xl:-ml-32 xl:-mr-32 mb-8">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors flex items-center text-sm font-medium">
          ← Back to Dashboard
        </button>
        {selectedForCompare.length > 0 && (
          <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
            <span className="text-sm font-medium text-white/80">
              {selectedForCompare.length}/2 Selected for Comparison
            </span>
            <button 
              disabled={selectedForCompare.length !== 2}
              onClick={handleCompareClick}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-all ${
                selectedForCompare.length === 2 
                ? 'bg-[var(--zen-brand-solid)] text-white shadow-[0_0_15px_rgba(30,70,32,0.3)]' 
                : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Compare Reports
            </button>
          </div>
        )}
      </div>

      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">Your Past Reports</h1>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl text-white/50">
          <FileText className="w-12 h-12 mb-4 opacity-50" />
          <p>No past reports found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r, i) => {
            const isSelected = selectedForCompare.includes(r.id);
            const canSelect = selectedForCompare.length < 2 || isSelected;
            
            return (
              <motion.div
                key={r.id || i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => canSelect && !selectedForCompare.length ? onSelectReport(r) : handleToggleCompare(r.id, {} as any)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col ${
                  isSelected 
                  ? 'bg-[var(--zen-brand-solid)]/20 border-[var(--zen-brand-solid)]' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center text-white/60 text-xs font-semibold uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  
                  <button 
                    onClick={(e) => handleToggleCompare(r.id, e)}
                    disabled={!canSelect}
                    className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[var(--zen-brand-solid)] border-[var(--zen-brand-solid)]' : 'border-white/30 hover:border-white/60'
                    } ${!canSelect ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                </div>
                
                <div className="flex items-end gap-3 mb-4">
                  <div className="text-4xl font-black text-white">{r.health_score}</div>
                  <div className="text-sm font-medium mb-1" style={{ color: 'var(--zen-brand-solid)' }}>{r.health_grade} Health</div>
                </div>
                
                <p className="text-sm text-white/70 line-clamp-2 mt-auto">
                  {r.health_summary || "Report analysis ready to view."}
                </p>
                
                {!selectedForCompare.length && (
                  <div className="absolute right-6 bottom-6 opacity-0 hover:opacity-100 transition-opacity">
                    <ArrowRight className="text-white/40" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
