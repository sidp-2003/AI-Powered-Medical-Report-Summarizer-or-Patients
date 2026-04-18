'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const getTestsText = (language: string, key: string) => {
  const copy: Record<string, Record<string, string>> = {
    noTests: { English: 'No test results to display.', Hindi: 'दिखाने के लिए कोई टेस्ट परिणाम नहीं है।', Marathi: 'दाखवण्यासाठी कोणतेही चाचणी निकाल नाहीत.', Tamil: 'காட்டுவதற்கு பரிசோதனை முடிவுகள் இல்லை.', Telugu: 'చూపించడానికి టెస్ట్ ఫలితాలు లేవు.', Bengali: 'দেখানোর মতো কোনো টেস্ট ফলাফল নেই।' },
    whyMatters: { English: 'Why this matters →', Hindi: 'यह क्यों महत्वपूर्ण है →', Marathi: 'हे का महत्त्वाचे आहे →', Tamil: 'இது ஏன் முக்கியம் →', Telugu: 'ఇది ఎందుకు ముఖ్యము →', Bengali: 'এটি কেন গুরুত্বপূর্ণ →' },
    withinRange: { English: 'Within expected range', Hindi: 'अपेक्षित सीमा में', Marathi: 'अपेक्षित मर्यादेत', Tamil: 'எதிர்பார்த்த வரம்பில்', Telugu: 'అంచనా పరిధిలో', Bengali: 'প্রত্যাশিত সীমার মধ্যে' },
    belowRange: { English: 'Below expected range', Hindi: 'अपेक्षित सीमा से कम', Marathi: 'अपेक्षित मर्यादेपेक्षा कमी', Tamil: 'எதிர்பார்த்த வரம்புக்கு கீழே', Telugu: 'అంచనా పరిధి కంటే తక్కువ', Bengali: 'প্রত্যাশিত সীমার নিচে' },
    aboveRange: { English: 'Above expected range', Hindi: 'अपेक्षित सीमा से अधिक', Marathi: 'अपेक्षित मर्यादेपेक्षा जास्त', Tamil: 'எதிர்பார்த்த வரம்புக்கு மேலே', Telugu: 'అంచనా పరిధి కంటే ఎక్కువ', Bengali: 'প্রত্যাশিত সীমার উপরে' },
    outsideRange: { English: 'Outside expected range', Hindi: 'अपेक्षित सीमा के बाहर', Marathi: 'अपेक्षित मर्यादेबाहेर', Tamil: 'எதிர்பார்த்த வரம்பிற்கு வெளியே', Telugu: 'అంచనా పరిధికి బయట', Bengali: 'প্রত্যাশিত সীমার বাইরে' },
    ref: { English: 'Ref', Hindi: 'संदर्भ', Marathi: 'संदर्भ', Tamil: 'குறிப்பு', Telugu: 'సూచన', Bengali: 'রেফ' },
    noExplanation: { English: 'No additional explanation available.', Hindi: 'कोई अतिरिक्त विवरण उपलब्ध नहीं है।', Marathi: 'अतिरिक्त स्पष्टीकरण उपलब्ध नाही.', Tamil: 'கூடுதல் விளக்கம் இல்லை.', Telugu: 'అదనపు వివరణ అందుబాటులో లేదు.', Bengali: 'অতিরিক্ত ব্যাখ্যা উপলব্ধ নেই।' },
    explainInChat: { English: 'Explain in Chat', Hindi: 'चैट में समझाएँ', Marathi: 'चॅटमध्ये समजावून सांगा', Tamil: 'அரட்டையில் விளக்கவும்', Telugu: 'చాట్‌లో వివరించండి', Bengali: 'চ্যাটে ব্যাখ্যা করুন' },
  };
  return copy[key]?.[language] || copy[key]?.English || key;
};

/* Maps technical test names → human-readable labels */
const HUMAN_NAMES: Record<string, string> = {
  'hemoglobin': 'Energy Levels', 'rbc': 'Red Blood Cell Count', 'wbc': 'Immune Defense',
  'platelets': 'Clotting Ability', 'hematocrit': 'Blood Thickness', 'mcv': 'Red Cell Size',
  'mch': 'Oxygen per Cell', 'mchc': 'Oxygen Density', 'rdw': 'Cell Size Variation',
  'neutrophils': 'Bacterial Defense', 'lymphocytes': 'Viral Defense', 'monocytes': 'Tissue Repair',
  'eosinophils': 'Allergy Response', 'basophils': 'Inflammation Markers',
  'esr': 'Inflammation Speed', 'crp': 'Inflammation Level',
  'glucose': 'Blood Sugar', 'fasting glucose': 'Fasting Blood Sugar',
  'hba1c': 'Long-term Sugar', 'insulin': 'Sugar Hormone',
  'total cholesterol': 'Total Cholesterol', 'ldl cholesterol': 'Bad Cholesterol', 'ldl': 'Bad Cholesterol',
  'hdl cholesterol': 'Good Cholesterol', 'hdl': 'Good Cholesterol',
  'triglycerides': 'Blood Fats', 'vldl': 'Very Bad Cholesterol',
  'tsh': 'Thyroid Control', 't3': 'Active Thyroid', 't4': 'Thyroid Storage',
  'free t3': 'Active Thyroid', 'free t4': 'Thyroid Storage',
  'creatinine': 'Kidney Filter', 'bun': 'Kidney Waste', 'blood urea nitrogen': 'Kidney Waste',
  'urea': 'Kidney Waste', 'egfr': 'Kidney Speed', 'uric acid': 'Joint Health',
  'sgpt': 'Liver (ALT)', 'sgot': 'Liver (AST)', 'alt': 'Liver (ALT)', 'ast': 'Liver (AST)',
  'alp': 'Bone & Liver', 'alkaline phosphatase': 'Bone & Liver',
  'bilirubin': 'Liver Pigment', 'total bilirubin': 'Liver Pigment',
  'direct bilirubin': 'Liver Processing', 'albumin': 'Blood Protein',
  'total protein': 'Body Protein', 'globulin': 'Immune Protein',
  'vitamin d': 'Sunshine Vitamin', 'vitamin b12': 'Nerve Vitamin',
  'iron': 'Iron Stores', 'ferritin': 'Iron Reserve', 'tibc': 'Iron Transport',
  'transferrin': 'Iron Carrier', 'calcium': 'Bone Mineral', 'phosphorus': 'Bone Partner',
  'magnesium': 'Muscle Mineral', 'sodium': 'Salt Balance',
  'potassium': 'Heart Mineral', 'chloride': 'Fluid Balance',
};

/* Category → icon SVG */
const CATEGORY_ICONS: Record<string, string> = {
  'CBC': '🩸', 'Lipids': '❤️', 'Metabolic': '⚡', 'Thyroid': '🦋',
  'Kidney': '🫘', 'Liver': '🫁', 'Vitamins': '☀️', 'Minerals': '💎',
  'Immune': '🛡️', 'General': '🔬',
};

function getHumanName(testName: string): string {
  const key = testName.toLowerCase().trim();
  if (HUMAN_NAMES[key]) return HUMAN_NAMES[key];
  for (const [k, v] of Object.entries(HUMAN_NAMES)) {
    if (k.length < 4) continue;
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryPattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
    if (wordBoundaryPattern.test(key)) return v;
  }
  return testName;
}

function getStatusStyle(status: string, severity: string) {
  if (status === 'normal') return { pill: 'zen-pill-normal', fill: 'var(--zen-normal-accent)', icon: '✓' };
  if (severity === 'mild') return { pill: 'zen-pill-mild', fill: 'var(--zen-mild-accent)', icon: '●' };
  return { pill: 'zen-pill-critical', fill: 'var(--zen-critical-accent)', icon: '!' };
}

function getCompactValue(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  if (raw.length <= 52) return raw;

  const lower = raw.toLowerCase();

  if (lower.includes('adenocarcinoma')) {
    const gleason = raw.match(/Gleason\s*\d\+\d\s*=\s*\d/i)?.[0];
    const size = raw.match(/up to\s*[\d.]+\s*mm/i)?.[0]?.replace(/\s+/g, ' ');
    const core = raw.match(/\d+\s*of\s*\d+\s*cores?/i)?.[0]?.replace(/\s+/g, ' ');

    const parts = ['Adenocarcinoma'];
    if (gleason) parts.push(gleason);
    if (size) parts.push(size);
    if (core) parts.push(core);

    return parts.join(' • ');
  }

  if (lower.includes('atypical small acinar proliferation')) {
    return 'ASAP (atypical acinar proliferation)';
  }

  const chunks = raw
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (chunks.length > 0) {
    const merged = chunks.join(' • ');
    if (merged.length <= 64) return merged;
  }

  const words = raw.split(/\s+/);
  return words.slice(0, 8).join(' ');
}

function getRangeLabel(status: string, language: string): string {
  if (status === 'normal') return getTestsText(language, 'withinRange');
  if (status.includes('low')) return getTestsText(language, 'belowRange');
  if (status.includes('high')) return getTestsText(language, 'aboveRange');
  return getTestsText(language, 'outsideRange');
}

function resolveMarkerPosition(test: any): number {
  const rawGauge = Number(test.gauge_position);
  let markerPos = Number.isFinite(rawGauge) ? rawGauge * 100 : 50;

  const valueText = String(test.value ?? '').toLowerCase();
  const referenceText = String(test.reference_range ?? '').toLowerCase();
  const isQualitativeNotDetectable =
    valueText.includes('not detectable') ||
    referenceText.includes('not detectable') ||
    referenceText === 'n/a';

  if (isQualitativeNotDetectable && test.status === 'normal') {
    markerPos = 50;
  }

  return Math.min(100, Math.max(0, markerPos));
}

export default function HumanReadableTests({ tests, uiLanguage = 'English', onExplainTest }: { tests: any[]; uiLanguage?: string; onExplainTest?: (test: any) => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!tests || tests.length === 0) {
    return (
      <div className="zen-glass-solid p-6">
        <p style={{ color: 'var(--zen-text-muted)', fontSize: '0.875rem' }}>
          {getTestsText(uiLanguage, 'noTests')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tests.map((test, i) => {
        const humanName = getHumanName(test.test_name);
        const primaryLabel = humanName || test.test_name;
        const isExpanded = expandedIdx === i;
        const isHovered = hoveredIdx === i;
        const style = getStatusStyle(test.status, test.severity);
        const markerPos = resolveMarkerPosition(test);
        const catIcon = CATEGORY_ICONS[test.category] || CATEGORY_ICONS['General'];
        const compactValue = getCompactValue(test.value);
        const unitText = String(test.unit ?? '').trim();
        const showUnit = unitText !== '' && unitText.toLowerCase() !== 'n/a' && unitText !== '—';

        return (
          <motion.div
            key={i}
            className="zen-glass-solid group relative cursor-pointer overflow-hidden"
            style={{ borderRadius: '20px' }}
            onClick={() => setExpandedIdx(isExpanded ? null : i)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            {/* Tooltip */}
            {isHovered && !isExpanded && (
              <div className="zen-tooltip">{getTestsText(uiLanguage, 'whyMatters')}</div>
            )}

            <div className="p-5">
              {/* Top: Icon + Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg"
                  style={{ background: test.status === 'normal' ? 'var(--zen-normal-bg)' : test.severity === 'mild' ? 'var(--zen-mild-bg)' : 'var(--zen-critical-bg)' }}
                >
                  {catIcon}
                </div>
                <span className={`zen-pill ${style.pill}`} style={{ fontSize: '0.65rem', padding: '3px 10px' }}>
                  {style.icon} {test.status.replace('_', ' ')}
                </span>
              </div>

              {/* Name */}
              <h4 className="font-semibold text-base mb-3" style={{ color: 'var(--zen-text)' }}>{primaryLabel}</h4>

              {/* Value */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-xl font-bold leading-tight" style={{ color: 'var(--zen-text)' }}>{compactValue}</span>
                {showUnit && <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{unitText}</span>}
              </div>

              {/* Visual range gauge */}
              <div className="mb-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1" style={{ color: 'var(--zen-text-faint)' }}>
                  <span>L</span>
                  <span>H</span>
                </div>
                <div className="relative h-6 rounded-full" style={{ background: '#D1D5DB' }}>
                  <div
                    className="absolute top-0 bottom-0 rounded-full"
                    style={{ left: '35%', right: '35%', background: '#A9D8C0' }}
                  />
                  <motion.div
                    initial={{ left: '50%' }}
                    animate={{ left: `${markerPos}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.03 }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ background: style.fill }}
                  />
                </div>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--zen-text-muted)' }}>
                {getRangeLabel(test.status, uiLanguage)}
              </p>
              <p className="text-xs mt-1.5" style={{ color: 'var(--zen-text-faint)' }}>
                {getTestsText(uiLanguage, 'ref')}: {test.reference_range || '—'}
              </p>

              {onExplainTest && (
                <div className="mt-3">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onExplainTest(test);
                    }}
                    className="zen-btn-ghost"
                    style={{ fontSize: '0.7rem', padding: '6px 10px' }}
                  >
                    {getTestsText(uiLanguage, 'explainInChat')}
                  </button>
                </div>
              )}
            </div>

            {/* Expanded explanation */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-2" style={{ borderTop: '1px solid var(--zen-border)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--zen-text-secondary)' }}>
                      {test.explanation || getTestsText(uiLanguage, 'noExplanation')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
