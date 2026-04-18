'use client';

import { motion } from 'framer-motion';
import { ExternalLink, PlayCircle, FileText } from 'lucide-react';

export default function SmartArticles({ resources }: { resources: any }) {
  if (!resources) return null;

  const youtube = resources.youtube || [];
  const articles = resources.articles || [];
  const allItems = [
    ...youtube.map((r: any) => ({ ...r, type: 'video' })),
    ...articles.map((r: any) => ({ ...r, type: 'article' })),
  ];

  if (allItems.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--zen-text)' }}>Curated For You</h3>
      <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>
        Articles and videos matched to your results
      </p>

      {/* Horizontal scroll */}
      <div className="zen-h-scroll">
        {allItems.slice(0, 8).map((item: any, i: number) => (
          <motion.a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="zen-glass-solid group block"
            style={{
              borderRadius: '24px',
              width: '260px',
              minHeight: '140px',
              padding: '20px',
              textDecoration: 'none',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            {/* Type icon */}
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
              style={{
                background: item.type === 'video' ? 'var(--zen-critical-bg)' : 'var(--zen-normal-bg)',
              }}
            >
              {item.type === 'video'
                ? <PlayCircle className="w-5 h-5" style={{ color: 'var(--zen-critical-text)' }} />
                : <FileText className="w-5 h-5" style={{ color: 'var(--zen-normal-text)' }} />
              }
            </div>

            {/* Badge */}
            <span
              className={`zen-pill ${item.type === 'video' ? 'zen-pill-critical' : 'zen-pill-normal'}`}
              style={{ fontSize: '0.6rem', padding: '2px 8px', marginBottom: '8px', display: 'inline-flex' }}
            >
              {item.type === 'video' ? 'Video' : 'Article'}
            </span>

            {/* Title */}
            <p
              className="text-xs font-medium leading-snug mt-2 group-hover:underline"
              style={{ color: 'var(--zen-text-secondary)' }}
            >
              {item.title}
            </p>

            <ExternalLink
              className="w-3.5 h-3.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--zen-text-faint)' }}
            />
          </motion.a>
        ))}
      </div>
    </div>
  );
}
