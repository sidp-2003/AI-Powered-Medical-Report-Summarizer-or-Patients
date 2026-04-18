'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, CheckCircle, Loader2, AlertTriangle, ChevronDown, Download, FileText, Clock, Bell, Volume2, VolumeX } from 'lucide-react';
import HealthScoreGauge from '../../components/dashboard/HealthScoreGauge';
import HumanReadableTests from '../../components/dashboard/HumanReadableTests';
import TrendRibbon from '../../components/dashboard/TrendRibbon';
import AIInsightCards from '../../components/dashboard/AIInsightCards';
import DrNearby from '../../components/dashboard/DrNearby';
import SmartArticles from '../../components/dashboard/SmartArticles';
import GovPolicies from '../../components/dashboard/GovPolicies';
import DownloadPDF from '../../components/dashboard/DownloadPDF';
import PathToNormal from '../../components/dashboard/PathToNormal';
import UploadPanel from '../../components/dashboard/UploadPanel';
import ChatWidget from '../../components/dashboard/ChatWidget';
import PastReportsTab from '../../components/dashboard/PastReportsTab';
import CanvasSequence from "@/components/CanvasSequence";
import { apiUrl } from '../../lib/api';

type UiLanguage = 'English' | 'Hindi' | 'Marathi' | 'Tamil' | 'Telugu' | 'Bengali';

const UI_TEXT: Record<string, Record<string, string>> = {
  extractingText: { English: 'Extracting text from report...', Hindi: 'रिपोर्ट से टेक्स्ट निकाला जा रहा है...', Marathi: 'रिपोर्टमधून मजकूर काढला जात आहे...', Tamil: 'அறிக்கையிலிருந்து உரை எடுக்கப்படுகிறது...', Telugu: 'రిపోర్ట్ నుండి టెక్స్ట్ తీసుకుంటోంది...', Bengali: 'রিপোর্ট থেকে লেখা বের করা হচ্ছে...' },
  identifyingParams: { English: 'Identifying medical parameters...', Hindi: 'चिकित्सीय पैरामीटर पहचाने जा रहे हैं...', Marathi: 'वैद्यकीय पॅरामीटर्स ओळखले जात आहेत...', Tamil: 'மருத்துவ அளவுகள் கண்டறியப்படுகிறது...', Telugu: 'వైద్య పరామితులు గుర్తిస్తోంది...', Bengali: 'মেডিকেল প্যারামিটার চিহ্নিত করা হচ্ছে...' },
  checkingRanges: { English: 'Checking reference ranges...', Hindi: 'रेफरेंस रेंज जाँची जा रही है...', Marathi: 'रेफरन्स रेंज तपासली जात आहे...', Tamil: 'குறிப்பு வரம்புகள் சரிபார்க்கப்படுகிறது...', Telugu: 'రెఫరెన్స్ రేంజ్‌లు తనిఖీ చేస్తోంది...', Bengali: 'রেফারেন্স রেঞ্জ যাচাই করা হচ্ছে...' },
  detectingPatterns: { English: 'Detecting clinical patterns...', Hindi: 'क्लिनिकल पैटर्न पहचाने जा रहे हैं...', Marathi: 'क्लिनिकल पॅटर्न शोधले जात आहेत...', Tamil: 'மருத்துவ முறைகள் கண்டறியப்படுகிறது...', Telugu: 'క్లినికల్ ప్యాటర్న్స్ గుర్తిస్తోంది...', Bengali: 'ক্লিনিকাল প্যাটার্ন শনাক্ত করা হচ্ছে...' },
  generatingSummary: { English: 'Generating your health summary...', Hindi: 'आपका स्वास्थ्य सारांश बनाया जा रहा है...', Marathi: 'तुमचा आरोग्य सारांश तयार होत आहे...', Tamil: 'உங்கள் சுகாதார சுருக்கம் உருவாக்கப்படுகிறது...', Telugu: 'మీ ఆరోగ్య సారాంశం రూపొందిస్తోంది...', Bengali: 'আপনার স্বাস্থ্য সারাংশ তৈরি হচ্ছে...' },
  tabOverview: { English: 'Overview', Hindi: 'अवलोकन', Marathi: 'आढावा', Tamil: 'சுருக்கம்', Telugu: 'అవలోకనం', Bengali: 'সারসংক্ষেপ' },
  tabActionPlan: { English: 'Action Plan', Hindi: 'कार्य योजना', Marathi: 'कृती योजना', Tamil: 'செயல் திட்டம்', Telugu: 'చర్యా ప్రణాళిక', Bengali: 'অ্যাকশন প্ল্যান' },
  tabResources: { English: 'Resources', Hindi: 'संसाधन', Marathi: 'संसाधने', Tamil: 'வளங்கள்', Telugu: 'వనరులు', Bengali: 'রিসোর্স' },
  tabPastReports: { English: 'Past Reports', Hindi: 'पिछली रिपोर्टें', Marathi: 'मागील रिपोर्ट', Tamil: 'முந்தைய அறிக்கைகள்', Telugu: 'గత రిపోర్టులు', Bengali: 'পূর্বের রিপোর্ট' },
  uploadReport: { English: 'Upload Report', Hindi: 'रिपोर्ट अपलोड करें', Marathi: 'रिपोर्ट अपलोड करा', Tamil: 'அறிக்கை பதிவேற்று', Telugu: 'రిపోర్ట్ అప్లోడ్ చేయండి', Bengali: 'রিপোর্ট আপলোড করুন' },
  notifications: { English: 'Notifications', Hindi: 'सूचनाएँ', Marathi: 'सूचना', Tamil: 'அறிவிப்புகள்', Telugu: 'నోటిఫికేషన్లు', Bengali: 'নোটিফিকেশন' },
  logout: { English: 'Log Out', Hindi: 'लॉग आउट', Marathi: 'लॉग आउट', Tamil: 'வெளியேறு', Telugu: 'లాగ్ అవుట్', Bengali: 'লগ আউট' },
  explainDisease: { English: 'Explain this disease', Hindi: 'इस बीमारी को समझाएँ', Marathi: 'हा आजार समजावून सांगा', Tamil: 'இந்த நோயை விளக்கவும்', Telugu: 'ఈ వ్యాధిని వివరించండి', Bengali: 'এই রোগটি ব্যাখ্যা করুন' },
  readAloud: { English: 'Read Aloud', Hindi: 'ज़ोर से पढ़ें', Marathi: 'मोठ्याने वाचा', Tamil: 'உரையை வாசிக்கவும்', Telugu: 'జోరుగా చదవండి', Bengali: 'উচ্চস্বরে পড়ুন' },
  stopReading: { English: 'Stop Reading', Hindi: 'पढ़ना बंद करें', Marathi: 'वाचन थांबवा', Tamil: 'வாசிப்பை நிறுத்து', Telugu: 'చదవడం ఆపు', Bengali: 'পড়া বন্ধ করুন' },
};

const SPEECH_LANG_MAP: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
};

const t = (language: string, key: string, fallback?: string) => {
  const dictionary = UI_TEXT[key];
  if (!dictionary) return fallback || key;
  return dictionary[language] || dictionary.English || fallback || key;
};

/* ──────────────────────────────────────────── */
/* LOADING SEQUENCE                             */
/* ──────────────────────────────────────────── */
const LoadingSequence = ({ uiLanguage }: { uiLanguage: string }) => {
  const [step, setStep] = useState(0);
  const steps = [
    t(uiLanguage, 'extractingText', 'Extracting text from report...'),
    t(uiLanguage, 'identifyingParams', 'Identifying medical parameters...'),
    t(uiLanguage, 'checkingRanges', 'Checking reference ranges...'),
    t(uiLanguage, 'detectingPatterns', 'Detecting clinical patterns...'),
    t(uiLanguage, 'generatingSummary', 'Generating your health summary...')
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s < 4 ? s + 1 : s));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-xl flex flex-col justify-center items-center mx-auto mt-16 bg-white/5 border border-white/10 rounded-2xl p-12">
      <div className="space-y-6 w-full max-w-sm mx-auto">
        {steps.map((text, i) => {
          const isActive = i === step;
          const isCompleted = i < step;
          return (
            <div key={i} className={`flex items-center space-x-4 transition-opacity duration-300 ${!isActive && !isCompleted ? 'opacity-40' : 'opacity-100'}`}>
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                {isCompleted ? (
                  <CheckCircle className="text-emerald-500 w-6 h-6" />
                ) : isActive ? (
                  <Loader2 className="animate-spin text-white w-6 h-6" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50" />
                )}
              </div>
              <span className={`font-medium ${isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/50'}`}>
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────── */
/* SECTION NAV                                  */
/* ──────────────────────────────────────────── */
const getTabs = (uiLanguage: string) => [
  { id: 'overview', label: t(uiLanguage, 'tabOverview', 'Overview') },
  { id: 'plan', label: t(uiLanguage, 'tabActionPlan', 'Action Plan') },
  { id: 'resources', label: t(uiLanguage, 'tabResources', 'Resources') },
  { id: 'history', label: t(uiLanguage, 'tabPastReports', 'Past Reports') },
];

/* ──────────────────────────────────────────── */
/* RESULTS VIEW — Zen Medical Bento Grid        */
/* ──────────────────────────────────────────── */
function ResultsView({ results, onReset, user, onLogout, onOpenNotifications, notificationCount, onViewReport, uiLanguage, onToggleReadAloud, isReadingAloud }: { results: any; onReset: () => void; user: { name: string; email: string }; onLogout: () => void; onOpenNotifications: () => void; notificationCount: number; onViewReport?: (r: any) => void; uiLanguage: string; onToggleReadAloud: () => void; isReadingAloud: boolean }) {
  const allTests = results.all_tests || results.tests || [];
  const healthScore = Number(results?.health_score ?? 0);
  const doctorQuestions = results.doctor_questions || [];
  const patterns = results.patterns || [];
  const predictedCondition = patterns.length
    ? [...patterns].sort((a: any, b: any) => (b?.confidence || 0) - (a?.confidence || 0))[0]
    : null;
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [explainRequest, setExplainRequest] = useState<{ id: number; content: string } | null>(null);
  const displayedQuestions = showAllQuestions ? doctorQuestions : doctorQuestions.slice(0, 3);
  const tabs = getTabs(uiLanguage);

  const handleViewPastReport = (report: any) => {
    const normalized = { ...report };
    normalized.all_tests = normalized.all_tests || normalized.tests || [];
    normalized.doctor_questions = normalized.doctor_questions || [];

    if (normalized.doctor_questions.length === 0) {
      (normalized.patterns || []).forEach((pattern: any) => {
        if (pattern?.doctor_questions) {
          normalized.doctor_questions.push(...pattern.doctor_questions);
        }
      });
      normalized.doctor_questions = Array.from(new Set(normalized.doctor_questions));
    }

    setShowAllQuestions(false);
    setActiveTab('overview');
    if (onViewReport) onViewReport(normalized);
  };

  const handleExplainDisease = () => {
    if (!predictedCondition) return;
    const content = `${predictedCondition.name}. ${predictedCondition.explanation || ''}`.trim();
    if (!content) return;

    setExplainRequest({
      id: Date.now(),
      content,
    });
  };

  const handleExplainHealthScore = () => {
    const tests = allTests || [];
    const flagged = tests.filter((test: any) => test?.status !== 'normal');
    const topDrivers = flagged
      .slice(0, 4)
      .map((test: any) => `${test.test_name} (${test.status})`)
      .join(', ');

    const summary = [
      `Health score: ${healthScore}/100.`,
      `Normal tests: ${tests.length - flagged.length}, flagged tests: ${flagged.length}.`,
      topDrivers ? `Key drivers: ${topDrivers}.` : '',
      results?.health_summary ? `Summary: ${results.health_summary}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    setExplainRequest({
      id: Date.now(),
      content: summary,
    });
  };

  const handleExplainBiomarker = (test: any) => {
    if (!test) return;

    const prompt = [
      `Biomarker: ${test.test_name || 'Unknown test'}.`,
      `Value: ${test.value ?? 'N/A'} ${test.unit || ''}`.trim(),
      `Status: ${test.status || 'N/A'}.`,
      `Reference range: ${test.reference_range || 'N/A'}.`,
      test.explanation ? `Current explanation: ${test.explanation}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    setExplainRequest({
      id: Date.now(),
      content: `Please explain this biomarker in simple terms for a patient in ${uiLanguage}: ${prompt}`,
    });
  };

  return (
    <div className="zen-results relative">
      <ChatWidget analysisData={results} explainRequest={explainRequest} uiLanguage={uiLanguage} />
      {/* Light Navbar */}
      <nav
        className="w-full px-6 py-4 flex justify-between items-center sticky top-0 z-50"
        style={{
          background: 'rgba(248, 249, 250, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--zen-border)',
        }}
      >
        <Link href="/" className="font-bold text-xl tracking-tight transition-colors" style={{ color: 'var(--zen-text)' }}>
          ClariMed
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap justify-end">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium" style={{ color: 'var(--zen-text)' }}>{user.name}</span>
            <span className="text-xs" style={{ color: 'var(--zen-text-faint)' }}>{user.email}</span>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            style={{
              background: 'var(--zen-brand)',
              color: 'var(--zen-brand-text)',
              border: '1px solid var(--zen-border)',
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onReset}
            className="zen-btn-ghost"
            style={{ fontSize: '0.8rem', padding: '8px 12px' }}
          >
            {t(uiLanguage, 'uploadReport', 'Upload Report')}
          </button>
          <button onClick={onOpenNotifications} className="zen-btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
            <Bell className="w-4 h-4" />
            {t(uiLanguage, 'notifications', 'Notifications')} ({notificationCount})
          </button>
          <button onClick={onToggleReadAloud} className="zen-btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
            {isReadingAloud ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isReadingAloud ? t(uiLanguage, 'stopReading', 'Stop Reading') : t(uiLanguage, 'readAloud', 'Read Aloud')}
          </button>
          <button onClick={onLogout} className="zen-btn-ghost" style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
            {t(uiLanguage, 'logout', 'Log Out')}
          </button>
        </div>
      </nav>

      {/* Tab Nav */}
      <div className="zen-section-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === id 
                ? 'text-[var(--zen-brand-text)] border-[var(--zen-brand-solid)]' 
                : 'text-[var(--zen-text-muted)] border-transparent hover:text-[var(--zen-text)] hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(id)}
            >
              {id === 'history' && <Clock className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 min-h-[70vh]">
        
        <AnimatePresence mode="wait">
          {/* ─── TAB: Overview ─── */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-8">
                <div className="zen-glass-solid p-6" style={{ borderRadius: '16px' }}>
                  <h3 className="zen-readable-title mb-1.5">How to read this report</h3>
                  <p className="zen-readable-body">
                    Start with your Health Score, then review any biomarker marked as "slightly off" or "needs attention". Use Action Plan for practical next steps and Questions for Your Doctor for your appointment.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <div className="zen-glass-solid p-6" style={{ borderRadius: '16px' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="zen-readable-title">AI Predicted Condition</h3>
                    {predictedCondition && (
                      <span className="zen-pill zen-pill-brand" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        {Math.round((predictedCondition.confidence || 0) * 100)}% confidence
                      </span>
                    )}
                  </div>

                  {predictedCondition ? (
                    <>
                      <p className="text-lg font-semibold mb-1" style={{ color: 'var(--zen-text)' }}>
                        {predictedCondition.name}
                      </p>
                      <p className="zen-readable-body">
                        {predictedCondition.explanation || 'Detected from the biomarker relationships in your report.'}
                      </p>
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={handleExplainDisease}
                          className="zen-btn-ghost"
                          style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                        >
                          {t(uiLanguage, 'explainDisease', 'Explain this disease')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="zen-readable-body">
                      No strong condition pattern was predicted from this report.
                    </p>
                  )}
                </div>
              </section>

              <section className="mb-12">
                <HealthScoreGauge
                  data={{ ...results, all_tests: allTests }}
                  uiLanguage={uiLanguage}
                  onExplainScore={handleExplainHealthScore}
                />
              </section>

              <section className="mb-12">
                <div className="mb-8">
                  <TrendRibbon tests={allTests} uiLanguage={uiLanguage} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--zen-text)' }}>Your Biomarkers</h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--zen-text-muted)' }}>
                    Tap any card to see a plain-English explanation
                  </p>
                  <HumanReadableTests tests={allTests} uiLanguage={uiLanguage} onExplainTest={handleExplainBiomarker} />
                </div>
              </section>
            </motion.div>
          )}

          {/* ─── TAB: Action Plan ─── */}
          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <AIInsightCards data={results} />
                  </div>
                  <div>
                    <PathToNormal pathData={results.path_to_normal} />
                  </div>
                </div>
              </section>

              {doctorQuestions.length > 0 && (
                <section className="mb-12">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: 'var(--zen-text)' }}>Questions for Your Doctor</h3>
                      <p className="text-sm" style={{ color: 'var(--zen-text-muted)' }}>Bring these to your next appointment</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {displayedQuestions.map((q: string, i: number) => (
                      <div key={i} className="zen-glass-solid p-4 flex gap-3 items-start cursor-pointer group" style={{ borderRadius: '14px' }} onClick={() => navigator.clipboard.writeText(q)}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--zen-brand)', color: 'var(--zen-brand-text)' }}>{i + 1}</span>
                        <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--zen-text-secondary)' }}>{q}</p>
                        <Copy className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--zen-text-faint)' }} />
                      </div>
                    ))}
                  </div>
                  {doctorQuestions.length > 3 && (
                    <button onClick={() => setShowAllQuestions(!showAllQuestions)} className="zen-btn-ghost mt-3 mx-auto" style={{ display: 'flex', fontSize: '0.75rem' }}>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllQuestions ? 'rotate-180' : ''}`} />
                      {showAllQuestions ? 'Show less' : `Show all ${doctorQuestions.length} questions`}
                    </button>
                  )}
                </section>
              )}
            </motion.div>
          )}

          {/* ─── TAB: Resources ─── */}
          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <section className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <DrNearby specialists={results.recommended_specialists} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="zen-glass-solid p-6" style={{ borderRadius: '20px' }}>
                      <h3 className="font-semibold text-base mb-2" style={{ color: 'var(--zen-text)' }}>Export Your Report</h3>
                      <p className="text-xs mb-4" style={{ color: 'var(--zen-text-faint)' }}>Download a comprehensive PDF with all findings</p>
                      <DownloadPDF analysisData={results} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <SmartArticles resources={results.curated_resources} />
              </section>

              {healthScore < 45 && (
                <section className="mb-12">
                  <GovPolicies analysisData={results} />
                </section>
              )}
            </motion.div>
          )}

          {/* ─── TAB: Past Reports ─── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <PastReportsTab
                userEmail={user.email}
                onViewReport={handleViewPastReport}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze Another */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-center pt-4"
        >
          <button onClick={onReset} className="zen-btn-ghost" style={{ padding: '12px 32px' }}>
            ← Analyze Another Report
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/* MAIN DASHBOARD                               */
/* ──────────────────────────────────────────── */
export default function Dashboard() {
  const QUICK_REMINDER_PRESETS = [7, 30, 60, 90];
  const router = useRouter();
  const [user, setUser] = useState<{ name: string, email: string } | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [viewState, setViewState] = useState<'upload' | 'loading' | 'results'>('upload');
  const [results, setResults] = useState<any>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [showReminderPrompt, setShowReminderPrompt] = useState(false);
  const [reminderDays, setReminderDays] = useState('30');
  const [reminderStep, setReminderStep] = useState<'ask' | 'days'>('ask');
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [quickReminderDays, setQuickReminderDays] = useState('30');
  const [quickReminderSaving, setQuickReminderSaving] = useState(false);
  const [quickReminderMessage, setQuickReminderMessage] = useState<string | null>(null);
  const [testNotificationArmed, setTestNotificationArmed] = useState(false);
  const [inAppNotification, setInAppNotification] = useState<string | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [readAloudError, setReadAloudError] = useState<string | null>(null);
  const dueReminderCheckInFlightRef = useRef(false);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('English');

  const stopReadAloud = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsReadingAloud(false);
  };

  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setReadAloudError('Read aloud is not supported in this browser.');
      return;
    }

    const speechSynthesisApi = window.speechSynthesis;
    if (isReadingAloud || speechSynthesisApi.speaking) {
      stopReadAloud();
      return;
    }

    const pageText = (document.querySelector('main')?.textContent || document.body.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!pageText) {
      setReadAloudError('No readable text found on this page.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(pageText.slice(0, 15000));
    utterance.lang = SPEECH_LANG_MAP[uiLanguage] || 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setIsReadingAloud(false);
    utterance.onerror = () => {
      setIsReadingAloud(false);
      setReadAloudError('Read aloud failed. Please try again.');
    };

    setReadAloudError(null);
    setIsReadingAloud(true);
    speechSynthesisApi.cancel();
    speechSynthesisApi.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!readAloudError) return;
    const timer = window.setTimeout(() => setReadAloudError(null), 3500);
    return () => window.clearTimeout(timer);
  }, [readAloudError]);

  const fetchScheduledNotifications = async (email?: string) => {
    const normalizedEmail = (email || user?.email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    try {
      const response = await fetch(apiUrl(`/reminders/${encodeURIComponent(normalizedEmail)}`));
      if (!response.ok) {
        let message = 'Failed to fetch scheduled notifications.';
        try {
          const err = await response.json();
          if (err?.detail) message = err.detail;
        } catch {}
        throw new Error(message);
      }

      const data = await response.json();
      setScheduledNotifications(Array.isArray(data?.reminders) ? data.reminders : []);
      setNotificationsError(null);
    } catch (error: any) {
      setNotificationsError(error?.message || 'Failed to fetch scheduled notifications.');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('medreport_user');
    if (!saved) {
      router.push('/auth');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.name || !parsed.email) throw new Error('Invalid user');
      setUser(parsed);
      const savedLanguage = localStorage.getItem('clarimed_ui_language') as UiLanguage | null;
      if (savedLanguage) {
        setUiLanguage(savedLanguage);
      }
    } catch (e) {
      localStorage.removeItem('medreport_user');
      router.push('/auth');
    }

    fetch(apiUrl('/'))
      .then(res => {
        setIsBackendOnline(res.ok);
      })
      .catch(() => setIsBackendOnline(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('medreport_user');
    router.push('/auth');
  };

  const handleAnalyze = async (
    file: File | null,
    age: string,
    gender: string,
    language: string,
    patientContext?: {
      known_conditions?: string;
      medications?: string;
      smoking_status?: string;
      sleep_hours?: string;
    }
  ) => {
    setUiLanguage((language as UiLanguage) || 'English');
    localStorage.setItem('clarimed_ui_language', language);
    setErrorBanner(null);
    if (!isBackendOnline) {
      setErrorBanner('Backend is offline. Start backend service to analyze reports.');
      return;
    }

    if (!file) {
      setErrorBanner('Please upload a PDF report to continue.');
      return;
    }

    setViewState('loading');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('age', age);
    formData.append('gender', gender);
    formData.append('language', language);
    if (patientContext) {
      formData.append('patient_context', JSON.stringify(patientContext));
    }

    if (user?.email) formData.append('user_email', user.email);

    try {
      const res = await fetch(apiUrl('/analyze'), {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        let friendlyMessage = 'Analysis failed. Please try again.';
        try {
          const errJson = await res.json();
          if (errJson?.detail) {
            friendlyMessage = errJson.detail;
          }
        } catch {
          const errBody = await res.text();
          if (errBody?.trim()) friendlyMessage = errBody;
        }
        throw new Error(friendlyMessage);
      }
      const data = await res.json();
      if (data?.report_language) {
        setUiLanguage(data.report_language as UiLanguage);
        localStorage.setItem('clarimed_ui_language', data.report_language);
      }

      data.all_tests = data.tests || [];
      data.doctor_questions = data.doctor_questions || [];
      if (data.doctor_questions.length === 0) {
        (data.patterns || []).forEach((p: any) => {
          if (p.doctor_questions) data.doctor_questions.push(...p.doctor_questions);
        });
        data.doctor_questions = Array.from(new Set(data.doctor_questions));
      }

      setTimeout(() => {
        setResults(data);
        setViewState('results');

        const score = Number(data?.health_score ?? 0);
        if (score < 45) {
          setReminderStep('ask');
          setReminderDays('30');
          setReminderMessage(null);
          setShowReminderPrompt(true);
        }
      }, 100);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorBanner(err.message || 'Failed to analyze the report with backend.');
      setViewState('upload');
    }
  };

  const handleReset = () => {
    setResults(null);
    setViewState('upload');
    setShowReminderPrompt(false);
    setReminderMessage(null);
  };

  const handleSaveReminder = async () => {
    if (!user?.email || !results) return;

    const days = Number(reminderDays);
    if (!Number.isInteger(days) || days <= 0) {
      setReminderMessage('Please enter a valid number of days greater than 0.');
      return;
    }

    try {
      setReminderSaving(true);
      setReminderMessage(null);
      const res = await fetch(apiUrl('/reminders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          remind_in_days: days,
          report_id: results?.id,
          health_score: results?.health_score,
        }),
      });

      if (!res.ok) {
        let message = 'Failed to save reminder. Please try again.';
        try {
          const err = await res.json();
          if (err?.detail) message = err.detail;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      const created = data?.reminder;

      setReminderMessage(`Reminder scheduled in ${days} days.`);
      if (created) {
        setScheduledNotifications((prev) => [created, ...prev]);
      }
      await fetchScheduledNotifications(user.email);
      setTimeout(() => setShowReminderPrompt(false), 1200);
    } catch (e: any) {
      setReminderMessage(e?.message || 'Failed to save reminder.');
    } finally {
      setReminderSaving(false);
    }
  };

  const handleOpenNotifications = async () => {
    if (!user?.email) return;

    setShowNotifications(true);
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      await fetchScheduledNotifications(user.email);
    } catch {
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleViewReminderReport = async (reportId?: string) => {
    if (!reportId) return;

    try {
      const res = await fetch(apiUrl(`/report/${encodeURIComponent(reportId)}`));
      if (!res.ok) {
        let message = 'Failed to load linked report.';
        try {
          const err = await res.json();
          if (err?.detail) message = err.detail;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      const report = data?.report;
      if (!report) {
        throw new Error('Linked report not found.');
      }

      report.all_tests = report.all_tests || report.tests || [];
      if (report?.report_language) {
        setUiLanguage(report.report_language as UiLanguage);
        localStorage.setItem('clarimed_ui_language', report.report_language);
      }
      report.doctor_questions = report.doctor_questions || [];
      if (report.doctor_questions.length === 0) {
        (report.patterns || []).forEach((pattern: any) => {
          if (pattern?.doctor_questions) {
            report.doctor_questions.push(...pattern.doctor_questions);
          }
        });
        report.doctor_questions = Array.from(new Set(report.doctor_questions));
      }

      setResults(report);
      setViewState('results');
      setShowNotifications(false);
      setNotificationsError(null);
    } catch (e: any) {
      setNotificationsError(e?.message || 'Failed to load linked report.');
    }
  };

  const handleCreateQuickNotification = async () => {
    if (!user?.email) return;

    const days = Number(quickReminderDays);
    if (!Number.isInteger(days) || days <= 0) {
      setQuickReminderMessage('Enter valid days (> 0).');
      return;
    }

    try {
      setQuickReminderSaving(true);
      setQuickReminderMessage(null);

      const res = await fetch(apiUrl('/reminders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user.email,
          remind_in_days: days,
          report_id: results?.id,
          health_score: results?.health_score,
        }),
      });

      if (!res.ok) {
        let message = 'Failed to create notification.';
        try {
          const err = await res.json();
          if (err?.detail) message = err.detail;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      const created = data?.reminder;
      if (created) {
        setScheduledNotifications((prev) => [created, ...prev]);
      }
      await fetchScheduledNotifications(user.email);
      setQuickReminderMessage(`Created reminder for ${days} days.`);
    } catch (e: any) {
      setQuickReminderMessage(e?.message || 'Failed to create notification.');
    } finally {
      setQuickReminderSaving(false);
    }
  };

  const handleTriggerTestNotification = async () => {
    if (typeof window === 'undefined' || !user?.email) {
      setQuickReminderMessage('Email test is not available in this environment.');
      return;
    }

    setTestNotificationArmed(true);
    setQuickReminderMessage('Test email will be sent in ~5 seconds.');
    setInAppNotification('Test email armed. Sending in around 5 seconds...');

    window.setTimeout(async () => {
      try {
        const response = await fetch(apiUrl('/reminders/test-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_email: user.email,
            report_id: results?.id,
          }),
        });

        if (!response.ok) {
          let message = 'Failed to send test email.';
          try {
            const errorJson = await response.json();
            if (errorJson?.detail) message = errorJson.detail;
          } catch {}
          throw new Error(message);
        }

        setInAppNotification(`Test reminder email sent to ${user.email}.`);
        setQuickReminderMessage(`Test reminder email sent to ${user.email}.`);
      } catch (error: any) {
        const message = error?.message || 'Failed to send test reminder email.';
        setInAppNotification(message);
        setQuickReminderMessage(message);
      } finally {
        setTestNotificationArmed(false);
        window.setTimeout(() => setInAppNotification(null), 3500);
      }
    }, 5000);
  };

  const checkDueEmailNotifications = async () => {
    if (!user?.email) return;
    if (typeof window === 'undefined') return;
    if (dueReminderCheckInFlightRef.current) return;

    try {
      dueReminderCheckInFlightRef.current = true;
      const res = await fetch(apiUrl(`/reminders/due/${encodeURIComponent(user.email)}`));
      if (!res.ok) return;

      const data = await res.json();
      const dueReminders = Array.isArray(data?.reminders) ? data.reminders : [];

      for (const reminder of dueReminders) {
        const body = `Your scheduled health reminder is due today${reminder?.health_score !== null && reminder?.health_score !== undefined ? ` • Health score: ${reminder.health_score}` : ''}.`;
        setInAppNotification(`Email reminder sent. ${body}`);
      }

      if (dueReminders.length > 0) {
        window.setTimeout(() => setInAppNotification(null), 5000);
        await fetchScheduledNotifications(user.email);
      }
    } catch (err) {
      console.error('Due reminder browser notification check failed:', err);
    } finally {
      dueReminderCheckInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!user?.email) return;

    fetchScheduledNotifications(user.email);
    checkDueEmailNotifications();
    const intervalId = window.setInterval(() => {
      checkDueEmailNotifications();
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [user?.email]);

  const renderNotificationsModal = () => {
    if (!showNotifications) return null;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-4">
        <div className="w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[80vh] overflow-y-auto" style={{ background: 'var(--zen-surface-solid)', borderColor: 'var(--zen-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--zen-text)' }}>Scheduled Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
            >
              Close
            </button>
          </div>

          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: 'var(--zen-border)', background: 'var(--zen-bg-soft)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--zen-text)' }}>Create New Notification</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={quickReminderDays}
                onChange={(e) => setQuickReminderDays(e.target.value)}
                className="w-32 border rounded-lg px-3 py-2 outline-none"
                style={{ borderColor: 'var(--zen-border)', background: 'white', color: 'var(--zen-text)' }}
              />
              <span className="text-sm" style={{ color: 'var(--zen-text-muted)' }}>days from now</span>
              <button
                onClick={handleCreateQuickNotification}
                disabled={quickReminderSaving}
                className="ml-auto px-3 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
              >
                {quickReminderSaving ? 'Creating...' : 'Create'}
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleTriggerTestNotification}
                disabled={testNotificationArmed}
                className="px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
              >
                {testNotificationArmed ? 'Sending in 5s…' : 'Temp test: email in 5s'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {QUICK_REMINDER_PRESETS.map((day) => {
                const active = quickReminderDays === String(day);
                return (
                  <button
                    key={`quick-${day}`}
                    onClick={() => setQuickReminderDays(String(day))}
                    className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                    style={{
                      borderColor: active ? 'rgba(16,185,129,0.7)' : 'var(--zen-border)',
                      background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: active ? '#047857' : 'var(--zen-text-muted)',
                    }}
                  >
                    {day} days
                  </button>
                );
              })}
            </div>
            {quickReminderMessage && (
              <p className="text-xs mt-2" style={{ color: quickReminderMessage.toLowerCase().includes('failed') ? '#FCA5A5' : '#34D399' }}>
                {quickReminderMessage}
              </p>
            )}
          </div>

          {notificationsLoading ? (
            <p className="text-sm" style={{ color: 'var(--zen-text-muted)' }}>Loading scheduled notifications...</p>
          ) : notificationsError && scheduledNotifications.length === 0 ? (
            <p className="text-sm text-red-600">{notificationsError}</p>
          ) : scheduledNotifications.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--zen-text-muted)' }}>No scheduled notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {scheduledNotifications.map((item, index) => (
                <div
                  key={item.id || index}
                  className="rounded-xl border p-4"
                  style={{ borderColor: 'var(--zen-border)', background: 'white' }}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--zen-text)' }}>Reminder in {item.remind_in_days} days</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--zen-text-muted)' }}>
                        Due: {item.due_at ? new Date(item.due_at).toLocaleString() : '—'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200">
                      {item.status || 'scheduled'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs" style={{ color: 'var(--zen-text-muted)' }}>
                    Health score: {item.health_score ?? '—'}
                    {item.report_id ? ` • Report: ${item.report_id}` : ''}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleViewReminderReport(item.report_id)}
                      disabled={!item.report_id}
                      className="px-3 py-1.5 rounded-lg text-xs border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
                    >
                      View Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user) return <div className="min-h-screen bg-black" />;

  /* ── Results View: Zen Medical Light Theme ── */
  if (viewState === 'results' && results) {
    return (
      <>
        {inAppNotification && (
          <div className="fixed top-24 right-6 z-[120] max-w-sm rounded-xl border px-4 py-3 shadow-xl"
            style={{ background: 'var(--zen-surface-solid)', borderColor: 'var(--zen-border)', color: 'var(--zen-text)' }}
          >
            <p className="text-sm font-medium">{inAppNotification}</p>
          </div>
        )}
        {readAloudError && (
          <div className="fixed top-24 left-6 z-[120] max-w-sm rounded-xl border px-4 py-3 shadow-xl"
            style={{ background: 'var(--zen-surface-solid)', borderColor: 'var(--zen-border)', color: 'var(--zen-text)' }}
          >
            <p className="text-sm font-medium">{readAloudError}</p>
          </div>
        )}
        <ResultsView
          results={results}
          onReset={handleReset}
          user={user}
          onLogout={handleLogout}
          onOpenNotifications={handleOpenNotifications}
          notificationCount={scheduledNotifications.length}
          uiLanguage={uiLanguage}
          onToggleReadAloud={handleToggleReadAloud}
          isReadingAloud={isReadingAloud}
          onViewReport={(report: any) => {
            setResults(report);
          }}
        />

        {renderNotificationsModal()}

        {showReminderPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-2xl" style={{ background: 'var(--zen-surface-solid)', borderColor: 'var(--zen-border)' }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--zen-text)' }}>Low Health Score Alert</h3>
              {reminderStep === 'ask' ? (
                <>
                  <p className="text-sm mb-5" style={{ color: 'var(--zen-text-muted)' }}>
                    Your health score is below 45. Do you want a reminder notification for your next test?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowReminderPrompt(false)}
                      className="px-4 py-2 rounded-lg border transition-colors"
                      style={{ borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setReminderStep('days')}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
                    >
                      Yes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm mb-3" style={{ color: 'var(--zen-text-muted)' }}>After how many days should we remind you?</p>
                  <input
                    type="number"
                    min={1}
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 outline-none"
                    style={{ borderColor: 'var(--zen-border)', background: 'white', color: 'var(--zen-text)' }}
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_REMINDER_PRESETS.map((day) => {
                      const active = reminderDays === String(day);
                      return (
                        <button
                          key={`low-score-${day}`}
                          onClick={() => setReminderDays(String(day))}
                          className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                          style={{
                            borderColor: active ? 'rgba(16,185,129,0.7)' : 'var(--zen-border)',
                            background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
                            color: active ? '#047857' : 'var(--zen-text-muted)',
                          }}
                        >
                          {day} days
                        </button>
                      );
                    })}
                  </div>
                  {reminderMessage && (
                    <p className="text-xs mt-3" style={{ color: reminderMessage.includes('scheduled') ? '#34D399' : '#FCA5A5' }}>
                      {reminderMessage}
                    </p>
                  )}
                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setReminderStep('ask')}
                      className="px-4 py-2 rounded-lg border transition-colors"
                      style={{ borderColor: 'var(--zen-border)', color: 'var(--zen-text-secondary)' }}
                      disabled={reminderSaving}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveReminder}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      disabled={reminderSaving}
                    >
                      {reminderSaving ? 'Saving...' : 'Save Reminder'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── Upload / Loading: Dark layout preserved ── */
  return (
    <div className="min-h-screen bg-[#050B18] text-white pb-20">
      <CanvasSequence className="pointer-events-none" />

      <div className="relative z-10">
        {/* NAVBAR (preserved dark) */}
        <nav className="w-full border-b border-white/10 px-6 py-4 flex justify-between items-center bg-[#050B18]/80 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="font-bold text-xl tracking-tight text-white/90 hover:text-white transition-colors">
            ClariMed
          </Link>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-white/50">{user.email}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleOpenNotifications}
              className="text-sm border border-white/20 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
            >
              Notifications ({scheduledNotifications.length})
            </button>
            <button
              onClick={handleToggleReadAloud}
              className="text-sm border border-white/20 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
            >
              {isReadingAloud ? t(uiLanguage, 'stopReading', 'Stop Reading') : t(uiLanguage, 'readAloud', 'Read Aloud')}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm border border-white/20 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors ml-4"
            >
              Log Out
            </button>
          </div>
        </nav>

        {/* BACKEND STATUS BANNER */}
        {!isBackendOnline && (
          <div className="w-full bg-amber-500/20 px-6 py-3 border-b border-amber-500/30 flex justify-center items-center text-amber-200">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">⚠️ Backend offline — analysis unavailable</span>
          </div>
        )}

        {/* ERROR BANNER */}
        {errorBanner && viewState === 'upload' && (
          <div className="max-w-xl mx-auto mt-8 flex justify-between items-center bg-red-500/10 border border-red-500/30 px-6 py-4 rounded-xl text-red-300">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3" />
              <span className="text-sm">{errorBanner}</span>
            </div>
          </div>
        )}

        {readAloudError && viewState !== 'results' && (
          <div className="max-w-xl mx-auto mt-4 flex justify-between items-center bg-red-500/10 border border-red-500/30 px-6 py-4 rounded-xl text-red-300">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-3" />
              <span className="text-sm">{readAloudError}</span>
            </div>
          </div>
        )}

        <main className="px-6 relative">
          <AnimatePresence mode="wait">
            {viewState === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <UploadPanel
                  onAnalyze={handleAnalyze}
                  selectedLanguage={uiLanguage}
                  onLanguageChange={(language) => {
                    setUiLanguage(language as UiLanguage);
                    localStorage.setItem('clarimed_ui_language', language);
                  }}
                />
              </motion.div>
            )}

            {viewState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <LoadingSequence uiLanguage={uiLanguage} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {showReminderPrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4">
            <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#0B1222] p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-2">Low Health Score Alert</h3>
              {reminderStep === 'ask' ? (
                <>
                  <p className="text-sm text-white/70 mb-5">
                    Your health score is below 45. Do you want a reminder notification for your next test?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowReminderPrompt(false)}
                      className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                    >
                      No
                    </button>
                    <button
                      onClick={() => setReminderStep('days')}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
                    >
                      Yes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/70 mb-3">After how many days should we remind you?</p>
                  <input
                    type="number"
                    min={1}
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/20 rounded-lg px-3 py-2 text-white outline-none focus:border-white/40"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {QUICK_REMINDER_PRESETS.map((day) => {
                      const active = reminderDays === String(day);
                      return (
                        <button
                          key={`upload-low-score-${day}`}
                          onClick={() => setReminderDays(String(day))}
                          className="px-2.5 py-1 rounded-lg text-xs border transition-colors"
                          style={{
                            borderColor: active ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.2)',
                            background: active ? 'rgba(16,185,129,0.2)' : 'transparent',
                            color: active ? '#6EE7B7' : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {day} days
                        </button>
                      );
                    })}
                  </div>
                  {reminderMessage && (
                    <p className="text-xs mt-3" style={{ color: reminderMessage.includes('scheduled') ? '#34D399' : '#FCA5A5' }}>
                      {reminderMessage}
                    </p>
                  )}
                  <div className="flex justify-end gap-3 mt-5">
                    <button
                      onClick={() => setReminderStep('ask')}
                      className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                      disabled={reminderSaving}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveReminder}
                      className="px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
                      disabled={reminderSaving}
                    >
                      {reminderSaving ? 'Saving...' : 'Save Reminder'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {renderNotificationsModal()}
      </div>
    </div>
  );
}
