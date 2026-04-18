'use client';

import { motion } from 'framer-motion';
import { Landmark, ExternalLink } from 'lucide-react';

type PolicyItem = {
  title: string;
  description: string;
  url: string;
  tags: string[];
};

const GOV_POLICIES: PolicyItem[] = [
  {
    title: 'Ayushman Bharat (PM-JAY)',
    description: 'Public health insurance scheme for eligible families with cashless hospitalization benefits.',
    url: 'https://pmjay.gov.in/',
    tags: ['general', 'critical', 'hospital', 'cardio', 'kidney', 'cancer'],
  },
  {
    title: 'Ayushman Bharat Health & Wellness Centres',
    description: 'Primary care services for prevention, screening, and management of chronic diseases.',
    url: 'https://ab-hwc.nhp.gov.in/',
    tags: ['general', 'diabetes', 'hypertension', 'thyroid', 'screening'],
  },
  {
    title: 'NPCDCS Programme',
    description: 'National programme for prevention and control of cancer, diabetes, cardiovascular diseases and stroke.',
    url: 'https://nhm.gov.in/index1.php?lang=1&level=2&sublinkid=1048&lid=604',
    tags: ['diabetes', 'cardio', 'stroke', 'cancer', 'screening'],
  },
  {
    title: 'eSanjeevani Telemedicine',
    description: 'Government teleconsultation platform for online doctor consultation.',
    url: 'https://esanjeevani.mohfw.gov.in/',
    tags: ['general', 'followup', 'consultation'],
  },
  {
    title: 'Pradhan Mantri Bhartiya Janaushadhi Pariyojana',
    description: 'Affordable generic medicines through Jan Aushadhi Kendras.',
    url: 'https://janaushadhi.gov.in/',
    tags: ['general', 'medication', 'long-term'],
  },
];

function inferTags(data: any): string[] {
  const tags = new Set<string>(['general']);
  const tests = data?.all_tests || data?.tests || [];
  const patterns = data?.patterns || [];
  const combined = [
    ...tests.map((t: any) => `${t?.test_name || ''} ${t?.category || ''}`.toLowerCase()),
    ...patterns.map((p: any) => `${p?.name || ''}`.toLowerCase()),
  ].join(' ');

  if (/glucose|hba1c|diabet|insulin/.test(combined)) tags.add('diabetes');
  if (/cholesterol|ldl|hdl|triglyceride|cardio|heart|hypertension|bp/.test(combined)) tags.add('cardio');
  if (/creatinine|urea|egfr|kidney|renal/.test(combined)) tags.add('kidney');
  if (/thyroid|tsh|t3|t4/.test(combined)) tags.add('thyroid');
  if (/cancer|carcinoma|tumou?r|oncology/.test(combined)) tags.add('cancer');
  if (/critical|urgent|severe/.test(combined)) tags.add('critical');

  return Array.from(tags);
}

export default function GovPolicies({ analysisData }: { analysisData: any }) {
  const tags = inferTags(analysisData);

  const ranked = GOV_POLICIES.map((policy) => {
    const score = policy.tags.reduce((acc, tag) => acc + (tags.includes(tag) ? 1 : 0), 0);
    return { ...policy, score };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (ranked.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Landmark className="w-4 h-4" style={{ color: 'var(--zen-brand-solid)' }} />
        <h3 className="font-semibold text-base" style={{ color: 'var(--zen-text)' }}>Government Policies & Schemes</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>
        Official GOV resources that may support diagnosis follow-up, treatment access, and affordability.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ranked.map((policy, index) => (
          <motion.a
            key={policy.title}
            href={policy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="zen-glass-solid p-4 block"
            style={{ borderRadius: '16px', textDecoration: 'none' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index, duration: 0.3 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--zen-text)' }}>{policy.title}</h4>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--zen-text-faint)' }} />
            </div>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--zen-text-muted)' }}>
              {policy.description}
            </p>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
