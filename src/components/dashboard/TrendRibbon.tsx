'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const getTrendText = (language: string, key: string) => {
  const copy: Record<string, Record<string, string>> = {
    normal: { English: 'Normal', Hindi: 'सामान्य', Marathi: 'सामान्य', Tamil: 'சாதாரணம்', Telugu: 'సాధారణం', Bengali: 'স্বাভাবিক' },
    mild: { English: 'Mild', Hindi: 'हल्का', Marathi: 'सौम्य', Tamil: 'லேசான', Telugu: 'తేలికపాటి', Bengali: 'মৃদু' },
    moderate: { English: 'Moderate', Hindi: 'मध्यम', Marathi: 'मध्यम', Tamil: 'மிதமான', Telugu: 'మోస్తరు', Bengali: 'মাঝারি' },
    highRisk: { English: 'High Risk', Hindi: 'उच्च जोखिम', Marathi: 'उच्च धोका', Tamil: 'உயர் ஆபத்து', Telugu: 'అధిక ప్రమాదం', Bengali: 'উচ্চ ঝুঁকি' },
    belowRange: { English: 'Below range', Hindi: 'सीमा से नीचे', Marathi: 'मर्यादेपेक्षा कमी', Tamil: 'வரம்புக்கு கீழே', Telugu: 'పరిధికి దిగువ', Bengali: 'সীমার নিচে' },
    aboveRange: { English: 'Above range', Hindi: 'सीमा से ऊपर', Marathi: 'मर्यादेपेक्षा जास्त', Tamil: 'வரம்புக்கு மேல்', Telugu: 'పరిధికి పైగా', Bengali: 'সীমার উপরে' },
    withinRange: { English: 'Within range', Hindi: 'सीमा में', Marathi: 'मर्यादेत', Tamil: 'வரம்பில்', Telugu: 'పరిధిలో', Bengali: 'সীমার মধ্যে' },
    status: { English: 'Status', Hindi: 'स्थिति', Marathi: 'स्थिती', Tamil: 'நிலை', Telugu: 'స్థితి', Bengali: 'অবস্থা' },
    distance: { English: 'Distance from normal', Hindi: 'सामान्य से दूरी', Marathi: 'सामान्यापासून अंतर', Tamil: 'சாதாரணத்திலிருந்து தூரம்', Telugu: 'సాధారణం నుండి దూరం', Bengali: 'স্বাভাবিক থেকে দূরত্ব' },
    ref: { English: 'Ref', Hindi: 'संदर्भ', Marathi: 'संदर्भ', Tamil: 'குறிப்பு', Telugu: 'సూచన', Bengali: 'রেফ' },
    testOverview: { English: 'Test Overview', Hindi: 'टेस्ट अवलोकन', Marathi: 'चाचणी आढावा', Tamil: 'சோதனை சுருக்கம்', Telugu: 'పరీక్ష సమీక్ష', Bengali: 'টেস্ট ওভারভিউ' },
    flagged: { English: 'Flagged', Hindi: 'चिह्नित', Marathi: 'चिन्हांकित', Tamil: 'குறிக்கப்பட்டது', Telugu: 'గుర్తించినవి', Bengali: 'চিহ্নিত' },
    top10: { English: 'Top 10 tests by distance from expected range. Higher bars need more attention.', Hindi: 'अपेक्षित सीमा से दूरी के आधार पर शीर्ष 10 टेस्ट। ऊँचे बार को अधिक ध्यान चाहिए।', Marathi: 'अपेक्षित मर्यादेपासून अंतरानुसार टॉप 10 चाचण्या. उंच बारला अधिक लक्ष द्या.', Tamil: 'எதிர்பார்த்த வரம்பிலிருந்து தூரத்தின் அடிப்படையில் முதல் 10 சோதனைகள். உயர்ந்த பட்டைகளுக்கு அதிக கவனம் தேவை.', Telugu: 'అంచనా పరిధి నుండి దూరం ఆధారంగా టాప్ 10 పరీక్షలు. ఎక్కువ ఎత్తు బార్లకు ఎక్కువ శ్రద్ధ అవసరం.', Bengali: 'প্রত্যাশিত সীমা থেকে দূরত্ব অনুযায়ী শীর্ষ ১০টি টেস্ট। উঁচু বারগুলিতে বেশি মনোযোগ দিন।' },
  };
  return copy[key]?.[language] || copy[key]?.English || key;
};

function getBarColor(status: string, severity: string): string {
  if (status === 'normal') return '#34A853';
  if (severity === 'mild') return '#F59E0B';
  if (severity === 'moderate') return '#F87171';
  return '#EF4444';
}

function getStatusLabel(status: string, severity: string, language: string): string {
  if (status === 'normal') return getTrendText(language, 'normal');
  if (severity === 'mild') return getTrendText(language, 'mild');
  if (severity === 'moderate') return getTrendText(language, 'moderate');
  return getTrendText(language, 'highRisk');
}

function getDeviationScore(test: any): number {
  const deviationValue = Number(test.deviation_pct);
  if (Number.isFinite(deviationValue) && Math.abs(deviationValue) > 0) {
    return Math.min(100, Math.abs(deviationValue));
  }

  const gaugePosition = Number(test.gauge_position);
  if (Number.isFinite(gaugePosition) && gaugePosition >= 0 && gaugePosition <= 1) {
    return Math.min(100, Math.abs(gaugePosition - 0.5) * 200);
  }

  if (test.status === 'normal') return 10;
  if (test.severity === 'mild') return 35;
  if (test.severity === 'moderate') return 65;
  return 85;
}

function truncateName(name: string, maxLen: number = 10): string {
  return name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
}

function getDirectionLabel(status: string, language: string): string {
  if (status.includes('low')) return getTrendText(language, 'belowRange');
  if (status.includes('high')) return getTrendText(language, 'aboveRange');
  return getTrendText(language, 'withinRange');
}

const CustomTooltip = ({ active, payload, uiLanguage }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="zen-glass-solid p-3" style={{ borderRadius: '12px', maxWidth: '200px' }}>
        <p className="font-semibold text-xs mb-1" style={{ color: 'var(--zen-text)' }}>{d.fullName}</p>
        <p className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>
          <span className="font-bold" style={{ color: 'var(--zen-text)' }}>{d.value}</span> {d.unit}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'status')}: {d.statusLabel} • {d.directionLabel}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'distance')}: {Math.round(d.deviationScore)}%</p>
        <p className="text-xs mt-1" style={{ color: 'var(--zen-text-faint)' }}>{getTrendText(uiLanguage, 'ref')}: {d.reference_range || '—'}</p>
      </div>
    );
  }
  return null;
};

export default function TrendRibbon({ tests, uiLanguage = 'English' }: { tests: any[]; uiLanguage?: string }) {
  if (!tests || tests.length === 0) return null;

  const chartData = tests
    .map((t: any) => {
      const deviationScore = getDeviationScore(t);
      return {
        name: truncateName(t.test_name, 14),
        fullName: t.test_name,
        value: t.value,
        unit: t.unit,
        reference_range: t.reference_range,
        deviationScore,
        statusLabel: getStatusLabel(t.status, t.severity, uiLanguage),
        directionLabel: getDirectionLabel(t.status, uiLanguage),
        barColor: getBarColor(t.status, t.severity),
        barHeight: Math.max(10, deviationScore),
        isNormal: t.status === 'normal',
      };
    })
    .sort((a, b) => b.barHeight - a.barHeight)
    .slice(0, 10);

  const normalCount = tests.filter((t: any) => t.status === 'normal').length;
  const flaggedCount = tests.length - normalCount;

  return (
    <div className="zen-glass-solid p-6">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="font-semibold text-base" style={{ color: 'var(--zen-text)' }}>{getTrendText(uiLanguage, 'testOverview')}</h3>
        <div className="flex items-center gap-2">
          <span className="zen-pill zen-pill-normal" style={{ fontSize: '0.68rem', padding: '3px 10px' }}>{normalCount} {getTrendText(uiLanguage, 'normal')}</span>
          <span className="zen-pill zen-pill-critical" style={{ fontSize: '0.68rem', padding: '3px 10px' }}>{flaggedCount} {getTrendText(uiLanguage, 'flagged')}</span>
        </div>
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--zen-text-faint)' }}>
        {getTrendText(uiLanguage, 'top10')}
      </p>

      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barCategoryGap="18%" margin={{ top: 5, right: 10, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.25)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6B7280', fontSize: 10 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={66}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            width={28}
          />
          <Tooltip content={<CustomTooltip uiLanguage={uiLanguage} />} cursor={false} />
          <Bar dataKey="barHeight" radius={[8, 8, 0, 0]} maxBarSize={28}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34A853' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'normal')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'mild')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F87171' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'moderate')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#EF4444' }} />
          <span className="text-xs" style={{ color: 'var(--zen-text-muted)' }}>{getTrendText(uiLanguage, 'highRisk')}</span>
        </div>
      </div>
    </div>
  );
}
