import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Activity, User, RefreshCw, Download, ChevronRight, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

const API_BASE_URL = "/api";

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const MOCK = {
  health_score: 68,
  health_grade: "Fair",
  health_summary: "Your blood report shows a few areas that need attention. You have mild anemia with low hemoglobin and iron stores, and your Vitamin D and B12 levels are significantly below the normal range. Your blood sugar, kidney, thyroid, and liver markers are all within healthy limits. With targeted supplementation and dietary changes, these values can improve meaningfully within 2–3 months.",
  tests: [
    { test_name: "Hemoglobin",        value: 10.8,   unit: "g/dL",    status: "low",    reference_range: "13.5-17.5",      category: "Blood",    deviation_pct: 20, explanation: "Carries oxygen through your body. Low levels cause fatigue and breathlessness." },
    { test_name: "WBC Count",         value: 7200,   unit: "/μL",     status: "normal", reference_range: "4500-11000",     category: "Immunity", deviation_pct: 0,  explanation: "White blood cells defend your body against infection." },
    { test_name: "Platelets",         value: 245000, unit: "/μL",     status: "normal", reference_range: "150000-400000",  category: "Blood",    deviation_pct: 0,  explanation: "Help your blood form clots to stop bleeding after injury." },
    { test_name: "Ferritin",          value: 8,      unit: "ng/mL",   status: "low",    reference_range: "30-400",         category: "Iron",     deviation_pct: 73, explanation: "Your body's iron storage protein. Very low levels confirm iron deficiency." },
    { test_name: "Vitamin D",         value: 11.2,   unit: "ng/mL",   status: "low",    reference_range: "30-100",         category: "Vitamins", deviation_pct: 63, explanation: "Critical for bone strength, immunity, and mood regulation." },
    { test_name: "Vitamin B12",       value: 210,    unit: "pg/mL",   status: "low",    reference_range: "300-900",        category: "Vitamins", deviation_pct: 30, explanation: "Supports nerve function, energy production, and red blood cell formation." },
    { test_name: "Blood Glucose",     value: 94,     unit: "mg/dL",   status: "normal", reference_range: "70-100",         category: "Metabolic",deviation_pct: 0,  explanation: "Primary energy source. Normal fasting levels indicate no diabetes risk." },
    { test_name: "Cholesterol (Total)",value: 218,   unit: "mg/dL",   status: "high",   reference_range: "0-200",          category: "Lipids",   deviation_pct: 9,  explanation: "Elevated total cholesterol raises long-term cardiovascular risk." },
    { test_name: "LDL Cholesterol",   value: 142,    unit: "mg/dL",   status: "high",   reference_range: "0-130",          category: "Lipids",   deviation_pct: 9,  explanation: "The 'bad' cholesterol — accumulates in artery walls over time." },
    { test_name: "Creatinine",        value: 0.9,    unit: "mg/dL",   status: "normal", reference_range: "0.7-1.3",        category: "Kidney",   deviation_pct: 0,  explanation: "Measures how effectively your kidneys filter waste from blood." },
    { test_name: "TSH",               value: 2.1,    unit: "mIU/L",   status: "normal", reference_range: "0.4-4.0",        category: "Thyroid",  deviation_pct: 0,  explanation: "Controls your thyroid gland's activity and metabolism." },
    { test_name: "SGPT (ALT)",        value: 28,     unit: "U/L",     status: "normal", reference_range: "7-56",           category: "Liver",    deviation_pct: 0,  explanation: "Liver enzyme — normal levels indicate a healthy liver." },
  ],
  score_breakdown: {
    "Blood": 55, "Immunity": 82, "Vitamins": 38,
    "Metabolic": 88, "Lipids": 62, "Kidney": 90, "Thyroid": 85, "Liver": 88,
  },
  patterns: [
    { name: "Iron Deficiency Anemia", severity: "moderate", confidence: 0.88, urgency: "moderate",
      explanation: "Low hemoglobin combined with critically low ferritin confirms iron-deficiency anemia." },
    { name: "Vitamin D Deficiency",   severity: "moderate", confidence: 0.95, urgency: "moderate",
      explanation: "Severe Vitamin D deficiency affects bone density, immunity, and energy levels." },
  ],
  doctor_questions: [
    "Should I start iron and ferritin supplements given my current levels?",
    "What Vitamin D dosage do you recommend for my level of 11.2 ng/mL?",
    "Is my cholesterol high enough to require medication or just lifestyle changes?",
    "Do I need a Vitamin B12 injection given my level of 210 pg/mL?",
  ]
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function parseRange(str) {
  if (!str) return null;
  const m = str.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : null;
}

function markerPct(value, rangeStr) {
  const r = parseRange(rangeStr);
  if (!r) return 50;
  const v = parseFloat(value);
  const span = r.max - r.min;
  const lo = r.min - span * 0.35;
  const hi = r.max + span * 0.35;
  return Math.max(2, Math.min(97, ((v - lo) / (hi - lo)) * 100));
}

const STATUS = {
  normal:        { fg: "#059669", bg: "#D1FAE5", bd: "#6EE7B7", label: "✓ Normal" },
  low:           { fg: "#2563EB", bg: "#DBEAFE", bd: "#93C5FD", label: "↓ Low" },
  high:          { fg: "#DC2626", bg: "#FEE2E2", bd: "#FCA5A5", label: "↑ High" },
  critical_low:  { fg: "#DC2626", bg: "#FEE2E2", bd: "#FCA5A5", label: "↓↓ Critical" },
  critical_high: { fg: "#DC2626", bg: "#FEE2E2", bd: "#FCA5A5", label: "↑↑ Critical" },
};
const sc = (s) => STATUS[s] || { fg: "#64748B", bg: "#F1F5F9", bd: "#CBD5E1", label: s };

const GRADE_CLR = { Excellent: "#059669", Good: "#10B981", Fair: "#F59E0B", Poor: "#EF4444", Critical: "#DC2626" };
const gc = (g) => GRADE_CLR[g] || "#64748B";

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score, grade }) {
  const r = 50, circ = 2 * Math.PI * r, prog = (score / 100) * circ;
  const col = gc(grade);
  return (
    <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
      <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#E2E8F0" strokeWidth="9" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={col} strokeWidth="9"
          strokeDasharray={`${prog} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: col, fontFamily: "'Fraunces',Georgia,serif", lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>/100</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, marginTop: 3 }}>{grade}</span>
      </div>
    </div>
  );
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
function MetricCard({ test, delay = 0 }) {
  const [hov, setHov] = useState(false);
  const s = sc(test.status);
  const pct = markerPct(test.value, test.reference_range);
  const isOdd = test.status !== "normal";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isOdd ? s.bg : "#FFFFFF",
        border: `1.5px solid ${isOdd ? s.bd : "#E2E8F0"}`,
        borderRadius: 16, padding: "18px 20px", position: "relative",
        transition: "transform .22s ease, box-shadow .22s ease",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov ? "0 14px 36px rgba(0,0,0,0.1)" : "0 1px 6px rgba(0,0,0,0.04)",
        animation: `mFadeUp .45s ${delay}s both`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{test.test_name}</div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{test.category}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: s.fg, background: s.bg, border: `1px solid ${s.bd}`, padding: "3px 10px", borderRadius: 99 }}>
          {s.label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 14 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: s.fg, fontFamily: "'Fraunces',Georgia,serif", lineHeight: 1 }}>
          {typeof test.value === "number" && test.value > 999
            ? test.value.toLocaleString()
            : test.value}
        </span>
        <span style={{ fontSize: 12, color: "#94A3B8" }}>{test.unit}</span>
      </div>

      {/* Range track */}
      <div style={{ height: 8, borderRadius: 99, background: "#E2E8F0", position: "relative", marginBottom: 6 }}>
        <div style={{ position: "absolute", left: "25%", width: "50%", height: "100%", background: "#6EE7B7", borderRadius: 99 }} />
        <div style={{
          position: "absolute", left: `${pct}%`, top: "50%",
          transform: "translate(-50%,-50%)",
          width: 16, height: 16, background: s.fg,
          border: "2.5px solid white", borderRadius: "50%",
          boxShadow: `0 0 0 3px ${s.fg}33`,
          transition: "left .9s cubic-bezier(.4,0,.2,1)", zIndex: 2,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8" }}>
        <span>Low</span>
        <span style={{ color: "#64748B", fontWeight: 600 }}>Normal: {test.reference_range}</span>
        <span>High</span>
      </div>

      {/* Hover tooltip */}
      {hov && test.explanation && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1E293B", color: "#F8FAFC",
          padding: "9px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.55,
          width: 230, zIndex: 100, textAlign: "center",
          boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
          pointerEvents: "none",
        }}>
          {test.explanation}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "7px solid #1E293B" }} />
        </div>
      )}
    </div>
  );
}

// ─── RADAR CHART ─────────────────────────────────────────────────────────────
function HealthRadar({ breakdown }) {
  const data = Object.entries(breakdown).map(([k, v]) => ({ subject: k, score: v, full: 100 }));
  return (
    <ResponsiveContainer width="100%" height={270}>
      <RadarChart data={data} margin={{ top: 10, right: 28, bottom: 10, left: 28 }}>
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10.5, fill: "#64748B", fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke="#0D9488" fill="#0D9488" fillOpacity={0.14} strokeWidth={2.5}
          dot={{ r: 4, fill: "#0D9488", stroke: "white", strokeWidth: 2 }} />
        <Tooltip
          contentStyle={{ background: "#1E293B", border: "none", borderRadius: 10, color: "white", fontSize: 12, padding: "8px 14px" }}
          formatter={(v) => [`${v}/100`, "Score"]}
          labelStyle={{ fontWeight: 700, marginBottom: 2 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── UPLOAD SCREEN ───────────────────────────────────────────────────────────
function UploadScreen({ onSubmit }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("M");
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const drop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFile(f);
  }, []);

  const go = async () => {
    if (!file) return;
    setLoading(true);
    await onSubmit({ file, name: name || "Patient", age: parseInt(age) || 30, gender });
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: "1.5px solid #E2E8F0", fontSize: 14, color: "#1E293B",
    outline: "none", boxSizing: "border-box", background: "white",
    fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#F8FAFC" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={22} color="white" />
        </div>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", fontFamily: "inherit" }}>
          ClariMed
        </span>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 44, maxWidth: 520 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: "0 0 16px", fontFamily: "'Fraunces',Georgia,serif", color: "#0F172A" }}>
          Your health report,<br />
          <span style={{ color: "#0D9488" }}>finally in plain English.</span>
        </h1>
        <p style={{ fontSize: 16, color: "#64748B", lineHeight: 1.7, margin: 0 }}>
          Upload any blood test PDF and get an instant AI‑powered breakdown — no medical degree required.
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "white", borderRadius: 24, padding: 32, boxShadow: "0 8px 48px rgba(0,0,0,0.08)", border: "1.5px solid #E2E8F0", width: "100%", maxWidth: 560 }}>
        {/* Patient fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>PATIENT NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>AGE</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 32" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: ".06em", display: "block", marginBottom: 6 }}>BIOLOGICAL SEX</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["M","F"].map(g => (
                <button key={g} onClick={() => setGender(g)} style={{
                  flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: gender === g ? "1.5px solid #0D9488" : "1.5px solid #E2E8F0",
                  background: gender === g ? "#CCFBF1" : "white",
                  color: gender === g ? "#0D9488" : "#64748B",
                  transition: "all .18s", fontFamily: "inherit",
                }}>
                  {g === "M" ? "Male" : "Female"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={drop} onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)} onClick={() => ref.current?.click()}
          style={{
            border: `2.5px dashed ${drag ? "#0D9488" : file ? "#10B981" : "#CBD5E1"}`,
            borderRadius: 20, padding: "44px 24px", textAlign: "center", cursor: "pointer",
            background: drag || file ? "#F0FDF4" : "#FAFAFA",
            transition: "all .22s", transform: drag ? "scale(1.015)" : "scale(1)", marginBottom: 16,
          }}
        >
          <input ref={ref} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
          {file ? (
            <>
              <div style={{ fontSize: 38, marginBottom: 10 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>{file.name}</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB — click to replace</div>
            </>
          ) : (
            <>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#F0FDF4", border: "1.5px solid #D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Upload size={24} color="#10B981" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1E293B" }}>Drop your PDF lab report here</div>
              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 4 }}>or click to browse — PDF only</div>
            </>
          )}
        </div>

        <button onClick={go} disabled={loading || !file} style={{
          width: "100%", padding: "15px 0", borderRadius: 14,
          background: loading ? "#94A3B8" : file ? "#0D9488" : "#E2E8F0",
          color: "white", fontSize: 15, fontWeight: 700, border: "none",
          cursor: file && !loading ? "pointer" : "not-allowed",
          transition: "all .22s", fontFamily: "inherit",
          boxShadow: file && !loading ? "0 6px 24px rgba(13,148,136,.32)" : "none",
        }}>
          {loading ? "🔍  Analyzing your report..." : "Analyze My Report →"}
        </button>

        <div style={{ textAlign: "center", marginTop: 13 }}>
          <button onClick={() => onSubmit({ file: null, name: "Alex Kumar", age: 32, gender: "M", mock: true })}
            style={{ fontSize: 13, color: "#0D9488", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            Try with demo data →
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 32, marginTop: 36, flexWrap: "wrap", justifyContent: "center" }}>
        {[["🔒","Private & secure"],["⚡","Results in seconds"],["📋","PDF report included"]].map(([ic,tx]) => (
          <div key={tx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>
            <span>{ic}</span><span>{tx}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ANALYZING SCREEN ────────────────────────────────────────────────────────
function AnalyzingScreen() {
  const steps = ["Extracting biomarkers", "Identifying patterns", "Generating insights"];
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#CCFBF1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", animation: "ping 2s infinite" }}>
          <Activity size={46} color="#0D9488" />
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1E293B", marginBottom: 8, fontFamily: "'Fraunces',Georgia,serif" }}>Analyzing your report</h2>
        <p style={{ fontSize: 15, color: "#94A3B8", marginBottom: 24 }}>Our AI is reading every biomarker carefully...</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ fontSize: 12, color: "#64748B", background: "white", padding: "7px 16px", borderRadius: 99, border: "1.5px solid #E2E8F0", animation: `mFadeUp .5s ${i * 0.38 + 0.2}s both` }}>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS DASHBOARD ───────────────────────────────────────────────────────
function ResultsDashboard({ analysis, patient, onReset, onDownload, downloading, demoMode }) {
  const [filter, setFilter] = useState("all");
  const tests = analysis.tests || [];
  const abnormal = tests.filter(t => t.status !== "normal");
  const normal = tests.filter(t => t.status === "normal");
  const shown = filter === "all" ? tests : tests.filter(t => t.status === filter);

  const navBtn = (onClick, children, accent) => (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: accent ? "none" : "1.5px solid #E2E8F0",
      background: accent ? "#0D9488" : "white",
      color: accent ? "white" : "#64748B", fontFamily: "inherit",
      boxShadow: accent ? "0 4px 16px rgba(13,148,136,.32)" : "none",
      transition: "all .2s",
    }}>{children}</button>
  );

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "#F8FAFC", color: "#1E293B" }}>

      {/* Sticky nav */}
      <div style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "13px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity size={18} color="white" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700 }}>ClariMed</span>
          {demoMode && <span style={{ fontSize: 11, fontWeight: 600, color: "#B45309", background: "#FEF3C7", padding: "3px 10px", borderRadius: 99, marginLeft: 4 }}>Demo mode</span>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {navBtn(onReset, "← New Report")}
          {navBtn(onDownload, downloading ? "⏳ Generating…" : "⬇ Download PDF", true)}
        </div>
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px" }}>

        {/* Patient header + score */}
        <div style={{ display: "flex", gap: 24, background: "white", borderRadius: 20, padding: 28, border: "1.5px solid #E2E8F0", marginBottom: 22, animation: "mFadeUp .5s both", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#CCFBF1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <User size={22} color="#0D9488" />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Fraunces',Georgia,serif" }}>{patient.name}</div>
                <div style={{ fontSize: 13, color: "#94A3B8" }}>{patient.age} yrs · {patient.gender === "M" ? "Male" : "Female"} · Analyzed today</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                ["Total Tests",  tests.length,    "#0D9488"],
                ["Abnormal",     abnormal.length, abnormal.length > 0 ? "#F59E0B" : "#10B981"],
                ["Normal",       normal.length,   "#10B981"],
                ["Patterns",     analysis.patterns?.length || 0, "#8B5CF6"],
              ].map(([lbl, val, clr]) => (
                <div key={lbl} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: clr, fontFamily: "'Fraunces',Georgia,serif", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <ScoreRing score={analysis.health_score} grade={analysis.health_grade} />
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 8 }}>Overall Health Score</div>
          </div>
        </div>

        {/* AI Summary */}
        <div style={{ background: "#F0FDF4", borderRadius: 16, padding: "18px 22px", border: "1.5px solid #D1FAE5", marginBottom: 24, animation: "mFadeUp .5s .08s both" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🩺</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#065F46", marginBottom: 5 }}>AI Health Summary</div>
              <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }}>{analysis.health_summary}</p>
            </div>
          </div>
        </div>

        {/* Two-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 24, animation: "mFadeUp .5s .14s both" }}>

          {/* Left: metrics */}
          <div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Biomarker Analysis</h2>
                <p style={{ fontSize: 13, color: "#94A3B8", margin: "3px 0 0" }}>Hover a card for a plain‑language explanation</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["all","All"],["low","Low"],["high","High"],["normal","Normal"]].map(([k,lbl]) => (
                  <button key={k} onClick={() => setFilter(k)} style={{
                    padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: filter === k ? "1.5px solid #0D9488" : "1.5px solid #E2E8F0",
                    background: filter === k ? "#CCFBF1" : "white",
                    color: filter === k ? "#0D9488" : "#64748B", fontFamily: "inherit",
                    transition: "all .18s",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {shown.map((t, i) => <MetricCard key={t.test_name} test={t} delay={i * 0.045} />)}
            </div>
          </div>

          {/* Right: radar + sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Radar */}
            <div style={{ background: "white", borderRadius: 20, padding: 24, border: "1.5px solid #E2E8F0" }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Health Categories</div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 8 }}>How each area is performing</div>
              <HealthRadar breakdown={analysis.score_breakdown || {}} />
            </div>

            {/* Patterns */}
            {analysis.patterns?.length > 0 && (
              <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1.5px solid #E2E8F0" }}>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Detected Patterns</div>
                {analysis.patterns.map(p => {
                  const isHigh = p.urgency === "high";
                  return (
                    <div key={p.name} style={{ padding: "12px 14px", borderRadius: 12, marginBottom: 10, background: isHigh ? "#FEF2F2" : "#FFFBEB", border: `1px solid ${isHigh ? "#FECACA" : "#FDE68A"}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                        Confidence: {Math.round(p.confidence * 100)}% · {p.severity?.charAt(0).toUpperCase() + p.severity?.slice(1)} severity
                      </div>
                      {p.explanation && <div style={{ fontSize: 12, color: "#64748B", marginTop: 5, lineHeight: 1.5 }}>{p.explanation}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Doctor questions */}
            {analysis.doctor_questions?.length > 0 && (
              <div style={{ background: "#EFF6FF", borderRadius: 20, padding: 22, border: "1.5px solid #BFDBFE" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1E40AF", marginBottom: 12 }}>Ask Your Doctor</div>
                {analysis.doctor_questions.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: "#1E40AF", lineHeight: 1.55 }}>
                    <span style={{ fontWeight: 800, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Download CTA */}
            <button onClick={onDownload} disabled={downloading}
              onMouseEnter={e => { if (!downloading) e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
              style={{
                width: "100%", padding: "18px 0",
                background: downloading ? "#94A3B8" : "#0D9488",
                color: "white", border: "none", borderRadius: 16,
                fontSize: 15, fontWeight: 800, cursor: downloading ? "not-allowed" : "pointer",
                boxShadow: "0 8px 28px rgba(13,148,136,.35)",
                transition: "all .25s", fontFamily: "inherit",
              }}>
              {downloading ? "⏳ Generating PDF…" : "⬇ Download Full PDF Report"}
              <div style={{ fontSize: 11, opacity: .75, fontWeight: 400, marginTop: 3 }}>Detailed analysis, action guide & resources</div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0 8px", borderTop: "1px solid #E2E8F0", marginTop: 32 }}>
          <p style={{ fontSize: 11, color: "#CBD5E1", margin: 0, lineHeight: 1.7 }}>
            ClariMed is for informational purposes only and does not constitute medical advice.<br />
            Always consult a qualified healthcare professional before making any health decisions.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState("upload");
  const [analysis, setAnalysis] = useState(null);
  const [patient, setPatient] = useState(null);
  const [fileRef, setFileRef] = useState(null);
  const [demo, setDemo] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&family=Fraunces:wght@700;800&display=swap";
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes mFadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
      @keyframes ping { 0%,100%{box-shadow:0 0 0 0 rgba(13,148,136,.45)} 60%{box-shadow:0 0 0 22px rgba(13,148,136,0)} }
      * { box-sizing: border-box; }
    `;
    document.head.appendChild(style);
  }, []);

  const handleSubmit = async ({ file, name, age, gender, mock }) => {
    setPatient({ name, age, gender });
    setFileRef(file);
    setDemo(mock || false);
    setStage("analyzing");

    if (mock) {
      setTimeout(() => { setAnalysis(MOCK); setStage("results"); }, 2400);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE_URL}/analyze`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setAnalysis(data);
      setDemo(false);
    } catch {
      setAnalysis(MOCK);
      setDemo(true);
    }
    setStage("results");
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const payload = {
        analysis: analysis,
        patient_name: patient.name || "Patient",
        age: parseInt(patient.age) || 30,
        gender: patient.gender || "M"
      };
      const res = await fetch(`${API_BASE_URL}/export/pdf`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
         let msg = "PDF generation failed";
         try { const err = await res.json(); msg = err.detail || msg; } catch(e){}
         throw new Error(msg);
      }
      const blob = await res.blob();
      const URLObj = window.URL || window.webkitURL;
      const downloadUrl = URLObj.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `ClariMed_${patient.name || 'Patient'}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URLObj.revokeObjectURL(downloadUrl);
    } catch (e) { 
      alert("Download failed: " + e.message); 
    }
    setDownloading(false);
  };

  if (stage === "upload") return <UploadScreen onSubmit={handleSubmit} />;
  if (stage === "analyzing") return <AnalyzingScreen />;
  return (
    <ResultsDashboard
      analysis={analysis} patient={patient}
      onReset={() => setStage("upload")}
      onDownload={handleDownload}
      downloading={downloading}
      demoMode={demo}
    />
  );
}