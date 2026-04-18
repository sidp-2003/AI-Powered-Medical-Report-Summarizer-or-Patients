'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function TestRow({ test }: { test: any }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-[#D1FAE5] text-[#065F46]';
      case 'low': 
      case 'high': return 'bg-[#FEF3C7] text-[#92400E]';
      case 'critical_low':
      case 'critical_high': return 'bg-[#FEE2E2] text-[#991B1B]';
      default: return 'bg-white/10 text-white';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-500';
      case 'low': 
      case 'high': return 'bg-amber-500';
      case 'critical_low':
      case 'critical_high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden mb-3">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.08] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center flex-1">
          <div className={`w-2 h-2 rounded-full mr-3 ${getStatusDot(test.status)}`} />
          <span className="font-medium text-white">{test.test_name}</span>
        </div>
        <div className="flex flex-1 justify-center items-center">
          <span className="text-white font-semibold">{test.value}</span>
          <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/70">{test.unit}</span>
        </div>
        <div className="flex flex-1 justify-end items-center space-x-3">
          <span className={`px-2 py-1 rounded-md text-xs font-semibold capitalize ${getStatusStyles(test.status)}`}>
            {test.status.replace('_', ' ')}
          </span>
          <ChevronDown className="w-5 h-5 text-white/50" />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 border-t border-white/10"
          >
            <div className="pt-3 space-y-2">
              <p className="text-white/50 text-sm">Reference: {test.reference_range}</p>
              <p className="text-white/80 text-sm">{test.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
