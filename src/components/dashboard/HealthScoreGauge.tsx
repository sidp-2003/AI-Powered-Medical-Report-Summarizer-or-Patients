'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const getGaugeText = (language: string, key: string) => {
  const copy: Record<string, Record<string, string>> = {
    healthScore: { English: 'Health Score', Hindi: 'हेल्थ स्कोर', Marathi: 'हेल्थ स्कोर', Tamil: 'ஆரோக்கிய மதிப்பெண்', Telugu: 'హెల్త్ స్కోర్', Bengali: 'হেলথ স্কোর' },
    excellent: { English: 'Excellent', Hindi: 'बेहतरीन', Marathi: 'उत्कृष्ट', Tamil: 'சிறந்தது', Telugu: 'అద్భుతం', Bengali: 'চমৎকার' },
    good: { English: 'Good', Hindi: 'अच्छा', Marathi: 'चांगले', Tamil: 'நன்று', Telugu: 'మంచిది', Bengali: 'ভালো' },
    fair: { English: 'Fair', Hindi: 'ठीक', Marathi: 'ठीक', Tamil: 'சராசரி', Telugu: 'సరాసరి', Bengali: 'মাঝারি' },
    needsAttention: { English: 'Needs Attention', Hindi: 'ध्यान आवश्यक', Marathi: 'लक्ष आवश्यक', Tamil: 'கவனம் தேவை', Telugu: 'శ్రద్ధ అవసరం', Bengali: 'মনোযোগ দরকার' },
    analyzed: { English: 'Your health report has been analyzed.', Hindi: 'आपकी स्वास्थ्य रिपोर्ट का विश्लेषण हो गया है।', Marathi: 'तुमच्या आरोग्य अहवालाचे विश्लेषण झाले आहे.', Tamil: 'உங்கள் சுகாதார அறிக்கை பகுப்பாய்வு செய்யப்பட்டுள்ளது.', Telugu: 'మీ ఆరోగ్య రిపోర్ట్ విశ్లేషించబడింది.', Bengali: 'আপনার স্বাস্থ্য রিপোর্ট বিশ্লেষণ করা হয়েছে।' },
    normal: { English: 'Normal', Hindi: 'सामान्य', Marathi: 'सामान्य', Tamil: 'சாதாரணம்', Telugu: 'సాధారణం', Bengali: 'স্বাভাবিক' },
    slightlyOff: { English: 'Slightly Off', Hindi: 'थोड़ा असामान्य', Marathi: 'थोडे बिघडलेले', Tamil: 'சிறிது மாறுபாடு', Telugu: 'కొద్దిగా భిన్నం', Bengali: 'সামান্য ভিন্ন' },
    needAttentionLabel: { English: 'Needs Attention', Hindi: 'ध्यान आवश्यक', Marathi: 'लक्ष आवश्यक', Tamil: 'கவனம் தேவை', Telugu: 'శ్రద్ధ అవసరం', Bengali: 'মনোযোগ দরকার' },
    scoreCalcTitle: { English: 'How this score is calculated', Hindi: 'यह स्कोर कैसे निकाला गया', Marathi: 'हा स्कोर कसा मोजला जातो', Tamil: 'இந்த மதிப்பெண் எப்படி கணக்கிடப்படுகிறது', Telugu: 'ఈ స్కోర్ ఎలా లెక్కించబడుతుంది', Bengali: 'এই স্কোর কীভাবে গণনা করা হয়' },
    scoreCalcBody: { English: 'The score is based on how far each test is from its normal range and the severity of flagged biomarkers. Normal tests improve the score, while moderate/critical deviations lower it.', Hindi: 'यह स्कोर इस पर आधारित है कि हर टेस्ट अपनी सामान्य सीमा से कितनी दूर है और फ्लैग किए गए बायोमार्कर कितने गंभीर हैं। सामान्य टेस्ट स्कोर बढ़ाते हैं, जबकि मध्यम/गंभीर विचलन स्कोर घटाते हैं।', Marathi: 'हा स्कोअर प्रत्येक चाचणी सामान्य मर्यादेपासून किती दूर आहे आणि फ्लॅग केलेल्या बायोमार्कर्सची तीव्रता किती आहे यावर आधारित असतो. सामान्य चाचण्या स्कोअर वाढवतात, तर मध्यम/गंभीर विचलन स्कोअर कमी करतात.', Tamil: 'ஒவ்வொரு பரிசோதனையும் சாதாரண வரம்பில் இருந்து எவ்வளவு விலகுகிறது மற்றும் குறிக்கப்பட்ட குறியீடுகளின் தீவிரம் என்ன என்பதின் அடிப்படையில் இந்த மதிப்பெண் கணக்கிடப்படுகிறது. சாதாரண முடிவுகள் மதிப்பெண்ணை உயர்த்தும்; மிதமான/கடுமையான விலகல்கள் மதிப்பெண்ணை குறைக்கும்.', Telugu: 'ప్రతి పరీక్ష సాధారణ పరిధి నుండి ఎంత దూరంగా ఉందో మరియు ఫ్లాగ్ అయిన బయోమార్కర్ల తీవ్రత ఎంత ఉందో ఆధారంగా ఈ స్కోర్ లెక్కించబడుతుంది. సాధారణ పరీక్షలు స్కోర్‌ను పెంచుతాయి; మోస్తరు/తీవ్ర వ్యత్యాసాలు స్కోర్‌ను తగ్గిస్తాయి.', Bengali: 'প্রতিটি টেস্ট স্বাভাবিক সীমা থেকে কতটা দূরে এবং চিহ্নিত বায়োমার্কারগুলির তীব্রতার ভিত্তিতে এই স্কোর নির্ধারিত হয়। স্বাভাবিক টেস্ট স্কোর বাড়ায়, আর মাঝারি/গুরুতর বিচ্যুতি স্কোর কমায়।' },
    explainScore: { English: 'Explain this score', Hindi: 'इस स्कोर को समझाएँ', Marathi: 'हा स्कोर समजावून सांगा', Tamil: 'இந்த மதிப்பெண்ணை விளக்கவும்', Telugu: 'ఈ స్కోర్‌ను వివరించండి', Bengali: 'এই স্কোর ব্যাখ্যা করুন' },
  };
  return copy[key]?.[language] || copy[key]?.English || key;
};

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--zen-normal-accent)';
  if (score >= 60) return 'var(--zen-mild-accent)';
  return 'var(--zen-critical-accent)';
}

function scoreGradient(score: number): string {
  if (score >= 80) return 'url(#gaugeGradGood)';
  if (score >= 60) return 'url(#gaugeGradFair)';
  return 'url(#gaugeGradPoor)';
}

function gradeLabel(score: number, language: string): string {
  if (score >= 90) return getGaugeText(language, 'excellent');
  if (score >= 80) return getGaugeText(language, 'good');
  if (score >= 60) return getGaugeText(language, 'fair');
  return getGaugeText(language, 'needsAttention');
}

function gradeEmoji(score: number): string {
  if (score >= 90) return '🌟';
  if (score >= 80) return '💚';
  if (score >= 60) return '⚡';
  return '⚠️';
}

/* Map severity to category labels */
function getCategoryStatus(tests: any[]): { label: string; status: string }[] {
  const categories: Record<string, string[]> = {};
  tests.forEach((t: any) => {
    const cat = t.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t.severity || t.status || 'normal');
  });

  return Object.entries(categories).map(([cat, severities]) => {
    const worst = severities.includes('critical')
      ? 'critical'
      : severities.includes('moderate')
        ? 'moderate'
        : severities.includes('mild')
          ? 'mild'
          : 'normal';

    const label = worst === 'normal' ? 'normal' : worst === 'mild' ? 'slightlyOff' : 'needAttentionLabel';
    return { label: `${cat}: ${label}`, status: worst };
  });
}

export default function HealthScoreGauge({ data, uiLanguage = 'English', onExplainScore }: { data: any; uiLanguage?: string; onExplainScore?: () => void }) {
  const [animScore, setAnimScore] = useState(0);
  const score = data.health_score ?? 0;
  const color = scoreColor(score);

  useEffect(() => {
    let start = 0;
    const duration = 1400;
    const inc = score / (duration / 16);
    const timer = setInterval(() => {
      start += inc;
      if (start >= score) {
        setAnimScore(score);
        clearInterval(timer);
      } else {
        setAnimScore(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 80;
  const circumference = Math.PI * radius; // semi-circle
  const offset = circumference - (score / 100) * circumference;

  const tests = data.all_tests || data.tests || [];
  const categoryStatuses = getCategoryStatus(tests);

  return (
    <div className="zen-glass-solid p-8 md:p-10 text-center">
      {/* Gradient defs */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gaugeGradGood" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34A853" />
            <stop offset="100%" stopColor="#81C784" />
          </linearGradient>
          <linearGradient id="gaugeGradFair" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="gaugeGradPoor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
        </defs>
      </svg>

      {/* Arc Gauge */}
      <div className="relative inline-flex justify-center mb-2 group">
        <p className="text-sm font-bold uppercase tracking-wider cursor-help" style={{ color: 'var(--zen-text-muted)' }}>
          {getGaugeText(uiLanguage, 'healthScore')}
        </p>
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 max-w-[90vw] rounded-xl border p-3 text-left text-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-10"
          style={{ background: 'var(--zen-surface-solid)', borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--zen-text)' }}>{getGaugeText(uiLanguage, 'scoreCalcTitle')}</p>
          <p>{getGaugeText(uiLanguage, 'scoreCalcBody')}</p>
        </div>
      </div>
      <div className="relative w-52 h-28 mx-auto mb-6">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#F3F4F6"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Fill */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={scoreGradient(score)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </svg>
        {/* Score in center */}
        <div className="absolute inset-0 flex flex-col justify-end items-center pb-1">
          <span className="text-5xl font-bold" style={{ color: 'var(--zen-text)' }}>{animScore}</span>
          <span className="text-sm font-semibold mt-0.5" style={{ color }}>{gradeEmoji(score)} {gradeLabel(score, uiLanguage)}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-sm leading-relaxed max-w-xl mx-auto mb-6" style={{ color: 'var(--zen-text-muted)' }}>
        {data.health_summary || getGaugeText(uiLanguage, 'analyzed')}
      </p>

      {onExplainScore && (
        <div className="mb-5 flex justify-center">
          <button
            onClick={onExplainScore}
            className="zen-btn-ghost"
            style={{ fontSize: '0.78rem', padding: '8px 12px' }}
          >
            {getGaugeText(uiLanguage, 'explainScore')}
          </button>
        </div>
      )}

      {/* Status Pills floating */}
      <div className="flex flex-wrap justify-center gap-2">
        {categoryStatuses.map((cs, i) => (
          <motion.span
            key={i}
            className={`zen-pill ${cs.status === 'normal' ? 'zen-pill-normal' : cs.status === 'mild' ? 'zen-pill-mild' : 'zen-pill-critical'}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.08, duration: 0.3 }}
          >
            {cs.status === 'normal' ? '✓' : cs.status === 'mild' ? '●' : '!'} {cs.label.replace('normal', getGaugeText(uiLanguage, 'normal')).replace('slightlyOff', getGaugeText(uiLanguage, 'slightlyOff')).replace('needAttentionLabel', getGaugeText(uiLanguage, 'needAttentionLabel'))}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
