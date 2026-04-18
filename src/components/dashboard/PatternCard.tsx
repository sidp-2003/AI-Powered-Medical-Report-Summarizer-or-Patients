'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function PatternCard({ pattern }: { pattern: any }) {
  const [expanded, setExpanded] = useState(false);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'border-emerald-500 bg-emerald-500';
      case 'moderate': return 'border-amber-500 bg-amber-500';
      case 'high': return 'border-red-500 bg-red-500';
      default: return 'border-white bg-white';
    }
  };

  return (
    <div className={`border border-white/10 rounded-2xl bg-white/5 overflow-hidden mb-4 border-l-4 ${getUrgencyColor(pattern.urgency).split(' ')[0]}`}>
      <div 
        className="p-5 cursor-pointer hover:bg-white/[0.08] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">{pattern.name}</h3>
            <span className="text-white/40 text-xs uppercase">ICD-10: {pattern.icd10}</span>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-xs text-white/60 w-24">Confidence</span>
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(pattern.confidence * 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full ${getUrgencyColor(pattern.urgency).split(' ')[1]}`}
            />
          </div>
          <span className="text-xs text-white/80 w-8">{Math.round(pattern.confidence * 100)}%</span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5 border-t border-white/10"
          >
            <div className="pt-4 space-y-4">
              <p className="text-white/80 text-sm">{pattern.explanation}</p>
              
              <div>
                <h4 className="text-sm text-white/60 mb-2">Symptoms to watch</h4>
                <div className="flex flex-wrap gap-2">
                  {pattern.symptoms.map((sym: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-white/10 text-white rounded-full text-xs">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm text-white/60 mb-2">Ask your doctor</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {pattern.doctor_questions.map((q: string, i: number) => (
                    <li key={i} className="text-white/80 text-sm">{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
