'use client';

import { motion } from 'framer-motion';
import { MapPin, ExternalLink } from 'lucide-react';

export default function DrNearby({ specialists }: { specialists: any[] }) {
  if (!specialists || specialists.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="w-4 h-4" style={{ color: 'var(--zen-brand-solid)' }} />
        <h3 className="font-semibold text-base" style={{ color: 'var(--zen-text)' }}>Recommended Specialists</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>
        Based on your report findings
      </p>

      <div className="space-y-3">
        {specialists.map((spec: any, i: number) => (
          <motion.div
            key={i}
            className="zen-glass-solid p-4 flex items-center gap-4"
            style={{ borderRadius: '16px' }}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.35 }}
          >
            {/* Circular Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
              style={{
                background: 'var(--zen-brand)',
                border: '2px solid var(--zen-brand-solid)',
              }}
            >
              {spec.emoji || '🩺'}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--zen-text)' }}>
                {spec.specialty}
              </h4>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--zen-text-muted)' }}>
                {spec.reason}
              </p>
            </div>

            <a
              href={`https://www.google.com/maps/search/${encodeURIComponent(spec.maps_query || spec.specialty + ' near me')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="zen-btn-primary flex-shrink-0"
              style={{ padding: '8px 16px', fontSize: '0.75rem', borderRadius: '12px' }}
            >
              <MapPin className="w-3 h-3" />
              Find
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
