'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Dumbbell, Salad } from 'lucide-react';
import Image from 'next/image';

export default function PathToNormal({ pathData }: { pathData: any }) {
  if (!pathData) return null;

  const swaps = pathData.dietary_swaps || [];
  const activity = pathData.activity_prescription || '';
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggleCheck = (i: number) => {
    setChecked(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="space-y-4">
      {/* Dietary Swaps */}
      {swaps.length > 0 && (
        <div className="zen-glass-solid overflow-hidden" style={{ borderRadius: '20px' }}>
          {/* Image header */}
          <div className="relative h-32 overflow-hidden">
            <Image
              src="/images/healthy-food.png"
              alt="Healthy food illustration"
              fill
              className="object-cover"
              style={{ filter: 'brightness(0.95) saturate(0.9)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, white 100%)' }} />
            <div className="absolute bottom-3 left-5 flex items-center gap-2">
              <Salad className="w-5 h-5" style={{ color: 'var(--zen-normal-text)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--zen-text)' }}>Dietary Swaps</h4>
            </div>
          </div>

          {/* Checklist */}
          <div className="p-5 space-y-2">
            {swaps.map((swap: string, i: number) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-50"
                onClick={() => toggleCheck(i)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <div
                  className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  style={{
                    background: checked[i] ? 'var(--zen-normal-accent)' : 'transparent',
                    border: checked[i] ? 'none' : '2px solid #D1D5DB',
                  }}
                >
                  {checked[i] && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className="text-sm leading-relaxed transition-all"
                  style={{
                    color: checked[i] ? 'var(--zen-text-faint)' : 'var(--zen-text-secondary)',
                    textDecoration: checked[i] ? 'line-through' : 'none',
                  }}
                >
                  {swap}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Prescription */}
      {activity && (
        <div className="zen-glass-solid overflow-hidden" style={{ borderRadius: '20px' }}>
          {/* Image header */}
          <div className="relative h-28 overflow-hidden">
            <Image
              src="/images/exercise-wellness.png"
              alt="Exercise wellness illustration"
              fill
              className="object-cover"
              style={{ filter: 'brightness(0.95) saturate(0.9)' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 40%, white 100%)' }} />
            <div className="absolute bottom-3 left-5 flex items-center gap-2">
              <Dumbbell className="w-5 h-5" style={{ color: 'var(--zen-mild-text)' }} />
              <h4 className="font-semibold text-sm" style={{ color: 'var(--zen-text)' }}>Activity Rx</h4>
            </div>
          </div>

          <div className="p-5">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--zen-text-secondary)' }}>
              {activity}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
