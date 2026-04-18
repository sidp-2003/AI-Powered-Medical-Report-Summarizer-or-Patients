'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, CheckCircle, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

const UPLOAD_UI_TEXT: Record<string, Record<string, string>> = {
  aiReady: {
    English: 'AI Analysis Ready',
    Hindi: 'AI विश्लेषण तैयार',
    Marathi: 'AI विश्लेषण तयार',
    Tamil: 'AI பகுப்பாய்வு தயார்',
    Telugu: 'AI విశ్లేషణ సిద్ధంగా ఉంది',
    Bengali: 'AI বিশ্লেষণ প্রস্তুত',
  },
  uploadTitle: {
    English: 'Upload Your Report',
    Hindi: 'अपनी रिपोर्ट अपलोड करें',
    Marathi: 'तुमचा रिपोर्ट अपलोड करा',
    Tamil: 'உங்கள் அறிக்கையை பதிவேற்றவும்',
    Telugu: 'మీ రిపోర్ట్‌ను అప్లోడ్ చేయండి',
    Bengali: 'আপনার রিপোর্ট আপলোড করুন',
  },
  uploadSubtitle: {
    English: 'Get a clear, easy-to-understand explanation in your selected language',
    Hindi: 'अपनी चुनी हुई भाषा में सरल और स्पष्ट व्याख्या पाएं',
    Marathi: 'तुमच्या निवडलेल्या भाषेत सोपी आणि स्पष्ट माहिती मिळवा',
    Tamil: 'நீங்கள் தேர்ந்தெடுத்த மொழியில் எளிய விளக்கத்தை பெறுங்கள்',
    Telugu: 'మీరు ఎంచుకున్న భాషలో సులభంగా అర్థమయ్యే వివరణ పొందండి',
    Bengali: 'আপনার নির্বাচিত ভাষায় সহজ ব্যাখ্যা পান',
  },
  dropHere: {
    English: 'Drop your report here',
    Hindi: 'अपनी रिपोर्ट यहाँ छोड़ें',
    Marathi: 'तुमचा रिपोर्ट येथे ड्रॉप करा',
    Tamil: 'உங்கள் அறிக்கையை இங்கே விடுங்கள்',
    Telugu: 'మీ రిపోర్ట్‌ను ఇక్కడ వదలండి',
    Bengali: 'রিপোর্ট এখানে দিন',
  },
  age: {
    English: 'Age',
    Hindi: 'उम्र',
    Marathi: 'वय',
    Tamil: 'வயது',
    Telugu: 'వయస్సు',
    Bengali: 'বয়স',
  },
  yourAge: {
    English: 'Your age',
    Hindi: 'आपकी उम्र',
    Marathi: 'तुमचे वय',
    Tamil: 'உங்கள் வயது',
    Telugu: 'మీ వయస్సు',
    Bengali: 'আপনার বয়স',
  },
  biologicalSex: {
    English: 'Biological Sex',
    Hindi: 'जैविक लिंग',
    Marathi: 'जैविक लिंग',
    Tamil: 'உயிரியல் பாலினம்',
    Telugu: 'జీవశాస్త్రీయ లింగం',
    Bengali: 'জৈবিক লিঙ্গ',
  },
  male: {
    English: 'Male',
    Hindi: 'पुरुष',
    Marathi: 'पुरुष',
    Tamil: 'ஆண்',
    Telugu: 'పురుషుడు',
    Bengali: 'পুরুষ',
  },
  female: {
    English: 'Female',
    Hindi: 'महिला',
    Marathi: 'स्त्री',
    Tamil: 'பெண்',
    Telugu: 'స్త్రీ',
    Bengali: 'মহিলা',
  },
  language: {
    English: 'Language',
    Hindi: 'भाषा',
    Marathi: 'भाषा',
    Tamil: 'மொழி',
    Telugu: 'భాష',
    Bengali: 'ভাষা',
  },
  generatedIn: {
    English: 'Report explanations and recommendations will be generated in',
    Hindi: 'रिपोर्ट की व्याख्या और सुझाव इस भाषा में बनाए जाएंगे',
    Marathi: 'रिपोर्टचे स्पष्टीकरण आणि सूचना या भाषेत तयार होतील',
    Tamil: 'அறிக்கை விளக்கங்கள் மற்றும் பரிந்துரைகள் இந்த மொழியில் உருவாகும்',
    Telugu: 'రిపోర్ట్ వివరణలు మరియు సూచనలు ఈ భాషలో రూపొందుతాయి',
    Bengali: 'রিপোর্টের ব্যাখ্যা এবং পরামর্শ এই ভাষায় তৈরি হবে',
  },
  analyze: {
    English: 'Analyze Report',
    Hindi: 'रिपोर्ट का विश्लेषण करें',
    Marathi: 'रिपोर्ट विश्लेषण करा',
    Tamil: 'அறிக்கையை பகுப்பாய்வு செய்க',
    Telugu: 'రిపోర్ట్‌ను విశ్లేషించండి',
    Bengali: 'রিপোর্ট বিশ্লেষণ করুন',
  },
  pleaseAdd: {
    English: 'Please add',
    Hindi: 'कृपया जोड़ें',
    Marathi: 'कृपया जोडा',
    Tamil: 'தயவுசெய்து சேர்க்கவும்',
    Telugu: 'దయచేసి జోడించండి',
    Bengali: 'অনুগ্রহ করে যোগ করুন',
  },
};

const getUploadText = (language: string, key: string) => {
  const dictionary = UPLOAD_UI_TEXT[key];
  if (!dictionary) return key;
  return dictionary[language] || dictionary.English || key;
};

/* ─────────── Dark Fluid Background ─────────── */
function DarkFluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const blobs = useRef<{ x: number; y: number; vx: number; vy: number; r: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Seed 5 dark blobs at random positions
    blobs.current = Array.from({ length: 5 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: 120 + Math.random() * 100,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobs.current.forEach((b) => {
        // Gently attract towards cursor
        const dx = mouse.current.x - b.x;
        const dy = mouse.current.y - b.y;
        b.vx += dx * 0.00008;
        b.vy += dy * 0.00008;

        // Dampen
        b.vx *= 0.985;
        b.vy *= 0.985;

        b.x += b.vx;
        b.y += b.vy;

        // Wrap edges softly
        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;

        // Draw dark radial gradient blob — very subtle dark tones
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.015)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    mouse.current.x = e.clientX - rect.left;
    mouse.current.y = e.clientY - rect.top;
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none"
      onMouseMove={handleMouseMove}
      style={{ pointerEvents: 'none' }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

/* ─────────── Upload Panel ─────────── */
export default function UploadPanel({
  onAnalyze,
  selectedLanguage = 'English',
  onLanguageChange,
}: {
  onAnalyze: (
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
  ) => void;
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [language, setLanguage] = useState(selectedLanguage);
  const [knownConditions, setKnownConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [smokingStatus, setSmokingStatus] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const isSupported = ['application/pdf', 'image/png', 'image/jpeg'].includes(droppedFile.type);
      const isWithinLimit = droppedFile.size <= 20 * 1024 * 1024;
      if (!isSupported) {
        setFormError('Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.');
        return;
      }
      if (!isWithinLimit) {
        setFormError('File is too large. Maximum allowed size is 20MB.');
        return;
      }
      setFormError(null);
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const isSupported = ['application/pdf', 'image/png', 'image/jpeg'].includes(selectedFile.type);
      const isWithinLimit = selectedFile.size <= 20 * 1024 * 1024;
      if (!isSupported) {
        setFormError('Unsupported file type. Please upload PDF, PNG, JPG, or JPEG.');
        return;
      }
      if (!isWithinLimit) {
        setFormError('File is too large. Maximum allowed size is 20MB.');
        return;
      }
      setFormError(null);
      setFile(selectedFile);
    }
  };

  const isSubmitDisabled = !file || !age || !gender;
  const missingFields = [
    !file ? 'report file' : null,
    !age ? 'age' : null,
    !gender ? 'biological sex' : null,
  ].filter(Boolean) as string[];

  /* Track mouse position for the fluid canvas */
  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouse.current.x = e.clientX - rect.left;
    mouse.current.y = e.clientY - rect.top;

    // Forward to canvas blobs
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const canvasBlobs = (canvas as any).__blobs;
      if (canvasBlobs) {
        canvasBlobs.mouse.x = mouse.current.x;
        canvasBlobs.mouse.y = mouse.current.y;
      }
    }
  }, []);

  useEffect(() => {
    setLanguage(selectedLanguage || 'English');
  }, [selectedLanguage]);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    onLanguageChange?.(value);
  };

  return (
    <div
      ref={containerRef}
      className="relative max-w-lg mx-auto mt-16"
      onMouseMove={handleContainerMouseMove}
    >
      {/* === Glass Card with Dark Fluid === */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] border-t-white/15 rounded-3xl p-10"
      >
        {/* Dark Fluid Background Layer */}
        <FluidBackground containerRef={containerRef} />

        {/* — Header — */}
        <div className="relative z-10 text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-1 mb-4">
            <span className="text-emerald-400 text-xs">●</span>
            <span className="text-xs text-white/70 font-medium">{getUploadText(language, 'aiReady')}</span>
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">{getUploadText(language, 'uploadTitle')}</h2>
          <p className="text-sm text-white/65 mt-1">{getUploadText(language, 'uploadSubtitle')}</p>
        </div>

        {/* — Drag Zone — */}
        <div
          className="relative z-10 group border border-white/[0.08] bg-white/[0.02] rounded-2xl p-10 text-center cursor-pointer hover:border-white/20 hover:bg-white/[0.05] hover:ring-1 hover:ring-white/[0.08] transition-all duration-300 mb-8"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-10 h-10 text-white/25 mx-auto" />
          <p className="text-white/80 font-medium mt-4">{getUploadText(language, 'dropHere')}</p>
          <p className="text-white/50 text-xs mt-1">PDF, JPG, JPEG, or PNG · Max 20MB</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          {file && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-full px-4 py-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>

        {/* — Form Fields — */}
        <div className="relative z-10 flex flex-col gap-5 mb-6">
          {/* Age */}
          <div>
            <label className="block text-xs text-white/65 font-medium mb-1.5">{getUploadText(language, 'age')}</label>
            <input
              type="number"
              placeholder={getUploadText(language, 'yourAge')}
              min="1" max="120"
              value={age}
              onChange={e => setAge(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white/95 placeholder:text-white/40 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs text-white/65 font-medium mb-1.5">{getUploadText(language, 'biologicalSex')}</label>
            <div className="grid grid-cols-2 gap-3">
              {['Male', 'Female'].map(g => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`py-3 rounded-xl font-medium transition-all duration-200 border ${
                    gender === g
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-white/[0.03] border-white/[0.08] text-white/65 hover:border-white/15 hover:text-white/85'
                  }`}
                >
                  {g === 'Male' ? '♂ ' : '♀ '}{g === 'Male' ? getUploadText(language, 'male') : getUploadText(language, 'female')}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs text-white/65 font-medium mb-1.5">{getUploadText(language, 'language')}</label>
            <div className="relative">
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white/95 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none pr-10"
              >
                {['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali'].map(lang => (
                  <option key={lang} value={lang} className="bg-neutral-900 text-white">{lang}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
            <p className="text-[11px] text-white/55 mt-1.5">{getUploadText(language, 'generatedIn')} {language}.</p>
          </div>

          <div className="pt-1">
            <p className="text-xs text-white/70 font-semibold mb-2">Optional personalization</p>
            <div className="grid grid-cols-1 gap-3">
              <textarea
                value={knownConditions}
                onChange={(e) => setKnownConditions(e.target.value)}
                placeholder="Known conditions (e.g., diabetes, hypertension)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white/95 placeholder:text-white/40 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none min-h-[74px] resize-y"
              />
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="Current medications (optional)"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white/95 placeholder:text-white/40 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none min-h-[74px] resize-y"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={smokingStatus}
                  onChange={(e) => setSmokingStatus(e.target.value)}
                  className="w-full appearance-none bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white/95 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none"
                >
                  <option value="" className="bg-neutral-900 text-white">Smoking status (optional)</option>
                  <option value="Never" className="bg-neutral-900 text-white">Never</option>
                  <option value="Occasional" className="bg-neutral-900 text-white">Occasional</option>
                  <option value="Regular" className="bg-neutral-900 text-white">Regular</option>
                  <option value="Former smoker" className="bg-neutral-900 text-white">Former smoker</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="Average sleep hours"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white/95 placeholder:text-white/40 focus:border-white/25 focus:bg-white/[0.06] transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {(formError || missingFields.length > 0) && (
          <div className="relative z-10 mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            {formError && <p className="text-xs text-red-300">{formError}</p>}
            {!formError && missingFields.length > 0 && (
              <p className="text-xs text-white/70">{getUploadText(language, 'pleaseAdd')}: {missingFields.join(', ')}.</p>
            )}
          </div>
        )}

        {/* — CTA — */}
        <button
          onClick={() => onAnalyze(file, age, gender, language, {
            known_conditions: knownConditions.trim(),
            medications: medications.trim(),
            smoking_status: smokingStatus,
            sleep_hours: sleepHours.trim(),
          })}
          disabled={isSubmitDisabled}
          className={`relative z-10 w-full rounded-2xl py-4 font-semibold transition-all duration-200 ${
            isSubmitDisabled
              ? 'bg-white/5 text-white/35 cursor-not-allowed border border-white/5'
              : 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]'
          }`}
        >
          {getUploadText(language, 'analyze')} &rarr;
        </button>
      </motion.div>
    </div>
  );
}

/* ─────────── Fluid Background (canvas inside card) ─────────── */
function FluidBackground({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const blobsRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; phase: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Seed dark blobs
    blobsRef.current = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 100 + Math.random() * 140,
      phase: i * 1.2,
    }));

    // Listen to mouse on the outer container so it works even over form fields
    const container = containerRef.current;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    container?.addEventListener('mousemove', onMouseMove);

    let frame = 0;
    let raf: number;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      blobsRef.current.forEach((b) => {
        // Attract to mouse gently
        const dx = mouseRef.current.x - b.x;
        const dy = mouseRef.current.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pull = Math.min(0.00015, 0.8 / (dist + 1));
        b.vx += dx * pull;
        b.vy += dy * pull;

        // Organic sway
        b.vx += Math.sin(frame * 0.008 + b.phase) * 0.02;
        b.vy += Math.cos(frame * 0.006 + b.phase) * 0.02;

        // Dampen
        b.vx *= 0.988;
        b.vy *= 0.988;

        b.x += b.vx;
        b.y += b.vy;

        // Wrap edges
        if (b.x < -b.r) b.x = canvas.width + b.r;
        if (b.x > canvas.width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = canvas.height + b.r;
        if (b.y > canvas.height + b.r) b.y = -b.r;

        // Breathing radius
        const breathR = b.r + Math.sin(frame * 0.012 + b.phase) * 15;

        // Draw: very dark, subtle white/grey radial — like dark ink in water
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, breathR);
        grad.addColorStop(0, 'rgba(255,255,255,0.045)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.02)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.006)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, breathR, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      container?.removeEventListener('mousemove', onMouseMove);
    };
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full rounded-3xl pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
