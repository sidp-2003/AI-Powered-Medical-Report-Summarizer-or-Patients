'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Download, BarChart2, Loader2, Check, Eye, Trash2, ArrowLeft, TrendingUp, ShieldAlert, HeartPulse } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { apiUrl } from '../../lib/api';

/* ─────────────────────────────────────────── */
/* TYPES                                       */
/* ─────────────────────────────────────────── */
interface PastReportsTabProps {
  userEmail: string;
  onViewReport: (report: any) => void;
}

function parseReportDate(timestamp: any): Date {
  if (timestamp instanceof Date) return timestamp;
  const raw = String(timestamp || '').trim();
  if (!raw) return new Date(0);

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw);
  const normalized = hasTimezone ? raw : `${raw}Z`;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

/* ─────────────────────────────────────────── */
/* PAST REPORTS TAB (full-featured)            */
/* ─────────────────────────────────────────── */
export default function PastReportsTab({ userEmail, onViewReport }: PastReportsTabProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareView, setCompareView] = useState(false);
  const [compareData, setCompareData] = useState<[any, any] | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [comparePdfLoading, setComparePdfLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const res = await fetch(apiUrl(`/reports/${encodeURIComponent(userEmail)}`));
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch reports on mount
  useEffect(() => {
    setIsLoading(true);
    fetchReports();
  }, [userEmail]);

  const handleToggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(prev => prev.filter(x => x !== id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare(prev => [...prev, id]);
    }
  };

  const handleStartCompare = async () => {
    if (selectedForCompare.length !== 2) return;
    const r1 = reports.find(r => r.id === selectedForCompare[0]);
    const r2 = reports.find(r => r.id === selectedForCompare[1]);
    if (!r1 || !r2) return;

    setCompareData([r1, r2]);
    setCompareView(true);
    setIsCompareLoading(true);
    setComparisonResult(null);

    try {
      const res = await fetch(apiUrl('/compare'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report1_id: r1.id, report2_id: r2.id })
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonResult(data.comparison);
      }
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setIsCompareLoading(false);
    }
  };

  const handleDownloadReportPdf = async (report: any) => {
    setDownloadingId(report.id);
    try {
      const res = await fetch(apiUrl('/export/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: report,
          patient_name: 'Patient',
          age: report.patient_age || 30,
          gender: report.patient_gender || 'M',
        }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = parseReportDate(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(/[, ]+/g, '_');
      a.download = `ClariMed_Report_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setTimeout(() => setDownloadingId(null), 1500);
    }
  };

  const handleDownloadComparisonPdf = async () => {
    if (!compareData || !comparisonResult) return;
    setComparePdfLoading(true);
    try {
      const res = await fetch(apiUrl('/export/comparison-pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report1: compareData[0],
          report2: compareData[1],
          comparison: comparisonResult,
        }),
      });
      if (!res.ok) throw new Error('Comparison PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClariMed_Comparison_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Comparison PDF error:', err);
    } finally {
      setTimeout(() => setComparePdfLoading(false), 1500);
    }
  };

  const handleDeleteReport = async (report: any) => {
    const confirmed = window.confirm('Delete this report permanently? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(report.id);
    try {
      const res = await fetch(
        apiUrl(`/report/${encodeURIComponent(report.id)}?user_email=${encodeURIComponent(userEmail)}`),
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Failed to delete report');
      }

      setReports(prev => prev.filter(r => r.id !== report.id));
      setSelectedForCompare(prev => prev.filter(id => id !== report.id));
    } catch (err) {
      console.error('Delete report error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── COMPARE VIEW ─── */
  if (compareView && compareData) {
    const r1Date = parseReportDate(compareData[0].created_at).getTime();
    const r2Date = parseReportDate(compareData[1].created_at).getTime();
    const olderReport = r1Date < r2Date ? compareData[0] : compareData[1];
    const newerReport = r1Date >= r2Date ? compareData[0] : compareData[1];
    const oldDateStr = parseReportDate(olderReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newDateStr = parseReportDate(newerReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Merge tests for chart
    const oldTests = olderReport.tests || [];
    const newTests = newerReport.tests || [];
    const testMap = new Map<string, any>();
    oldTests.forEach((t: any) => {
      testMap.set(t.test_name, { name: t.test_name, unit: t.unit, older: typeof t.value === 'number' ? t.value : parseFloat(t.value) || 0 });
    });
    newTests.forEach((t: any) => {
      const existing = testMap.get(t.test_name) || { name: t.test_name, unit: t.unit };
      existing.newer = typeof t.value === 'number' ? t.value : parseFloat(t.value) || 0;
      testMap.set(t.test_name, existing);
    });
    const chartData = Array.from(testMap.values()).filter(t => t.older !== undefined && t.newer !== undefined).slice(0, 12);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
        {/* Back + Export Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => { setCompareView(false); setComparisonResult(null); }}
            className="flex items-center text-sm font-medium transition-colors"
            style={{ color: 'var(--zen-text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reports
          </button>
          <button
            onClick={handleDownloadComparisonPdf}
            disabled={isCompareLoading || comparePdfLoading || !comparisonResult}
            className="zen-btn-primary flex items-center disabled:opacity-50"
            style={{ padding: '10px 20px', borderRadius: '14px', fontSize: '0.8rem' }}
          >
            {comparePdfLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download Comparison PDF</>
            )}
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--zen-text)' }}>Health Trajectory Report</h2>
          <p className="text-sm font-medium" style={{ color: 'var(--zen-text-faint)' }}>
            Comparing {oldDateStr} → {newDateStr}
          </p>
        </div>

        {/* Score Comparison Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="zen-glass-solid p-5 text-center" style={{ borderRadius: '18px' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--zen-text-faint)' }}>Older Report</p>
            <div className="text-4xl font-black mb-1" style={{ color: 'var(--zen-text)' }}>{olderReport.health_score}</div>
            <p className="text-xs font-medium" style={{ color: 'var(--zen-text-muted)' }}>{olderReport.health_grade} • {oldDateStr}</p>
          </div>
          <div className="zen-glass-solid p-5 text-center" style={{ borderRadius: '18px', borderColor: 'var(--zen-brand-solid)', borderWidth: '2px' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--zen-brand-solid)' }}>Latest Report</p>
            <div className="text-4xl font-black mb-1" style={{ color: 'var(--zen-brand-solid)' }}>{newerReport.health_score}</div>
            <p className="text-xs font-medium" style={{ color: 'var(--zen-text-muted)' }}>{newerReport.health_grade} • {newDateStr}</p>
          </div>
        </div>

        {isCompareLoading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-[var(--zen-brand-solid)] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-semibold text-sm" style={{ color: 'var(--zen-brand-solid)' }}>Running AI comparative analysis…</p>
          </div>
        ) : comparisonResult ? (
          <div className="space-y-6">
            {/* Improved / Declined */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl" style={{ background: 'var(--zen-normal)', border: '1px solid var(--zen-normal-border, #C8E6C9)' }}>
                <div className="flex items-center mb-3">
                  <TrendingUp className="w-4 h-4 mr-2" style={{ color: 'var(--zen-normal-text)' }} />
                  <h4 className="font-bold text-sm" style={{ color: 'var(--zen-normal-text)' }}>What Improved</h4>
                </div>
                <ul className="space-y-2">
                  {comparisonResult.improved?.map((txt: string, i: number) => (
                    <li key={i} className="flex items-start text-sm" style={{ color: 'var(--zen-normal-text)' }}>
                      <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--zen-normal-text)' }} />
                      <span>{txt.replace(/\*/g, '')}</span>
                    </li>
                  )) || <p className="text-sm opacity-60">No significant improvements.</p>}
                </ul>
              </div>
              <div className="p-5 rounded-2xl" style={{ background: 'var(--zen-warning)', border: '1px solid var(--zen-warning-border, #FFE0B2)' }}>
                <div className="flex items-center mb-3">
                  <ShieldAlert className="w-4 h-4 mr-2" style={{ color: 'var(--zen-warning-text)' }} />
                  <h4 className="font-bold text-sm" style={{ color: 'var(--zen-warning-text)' }}>Areas to Monitor</h4>
                </div>
                <ul className="space-y-2">
                  {comparisonResult.declined?.map((txt: string, i: number) => (
                    <li key={i} className="flex items-start text-sm" style={{ color: 'var(--zen-warning-text)' }}>
                      <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--zen-warning-text)' }} />
                      <span>{txt.replace(/\*/g, '')}</span>
                    </li>
                  )) || <p className="text-sm opacity-60">No negative trends.</p>}
                </ul>
              </div>
            </div>

            {/* Bar Chart */}
            {chartData.length > 0 && (
              <div className="zen-glass-solid p-6" style={{ borderRadius: '20px' }}>
                <h4 className="font-bold text-sm mb-6 flex items-center" style={{ color: 'var(--zen-text)' }}>
                  <HeartPulse className="w-4 h-4 mr-2" style={{ color: 'var(--zen-brand-solid)' }} />
                  Biomarker Shifts
                </h4>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="older" name={`${oldDateStr}`} fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="newer" name={`${newDateStr}`} fill="var(--zen-brand-solid)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="zen-glass-solid p-6" style={{ borderRadius: '20px' }}>
              <h4 className="font-bold text-sm mb-4" style={{ color: 'var(--zen-text)' }}>Recommended Next Steps</h4>
              <ul className="space-y-3">
                {comparisonResult.next_steps?.map((txt: string, i: number) => (
                  <li key={i} className="flex gap-3 p-4 rounded-xl text-sm" style={{ background: 'var(--zen-bg)', color: 'var(--zen-text-secondary)' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: 'var(--zen-brand-solid)' }}>
                      {i + 1}
                    </div>
                    <span>{txt.replace(/\*/g, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm py-12" style={{ color: 'var(--zen-text-faint)' }}>Unable to load comparison data.</p>
        )}
      </motion.div>
    );
  }

  /* ─── REPORTS LIST VIEW ─── */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: 'var(--zen-brand-solid)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--zen-text-muted)' }}>Loading your history…</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <FileText className="w-12 h-12 mb-4" style={{ color: 'var(--zen-text-faint)', opacity: 0.4 }} />
        <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--zen-text)' }}>No Past Reports</h3>
        <p className="text-sm max-w-sm" style={{ color: 'var(--zen-text-muted)' }}>
          Once you analyze a blood report, it'll automatically appear here. You can revisit, download, and compare them over time.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
      {/* Compare Action Bar */}
      {selectedForCompare.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="zen-glass-solid p-4 mb-6 flex items-center justify-between"
          style={{ borderRadius: '16px', borderColor: 'var(--zen-brand-solid)', borderWidth: '1px' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--zen-text-secondary)' }}>
            {selectedForCompare.length}/2 reports selected for comparison
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedForCompare([])}
              className="zen-btn-ghost"
              style={{ fontSize: '0.75rem', padding: '6px 14px' }}
            >
              Clear
            </button>
            <button
              disabled={selectedForCompare.length !== 2}
              onClick={handleStartCompare}
              className="zen-btn-primary flex items-center disabled:opacity-40"
              style={{ fontSize: '0.75rem', padding: '8px 18px', borderRadius: '12px' }}
            >
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              Compare
            </button>
          </div>
        </motion.div>
      )}

      {/* Hint at the top */}
      <p className="text-xs mb-5" style={{ color: 'var(--zen-text-faint)' }}>
        Select any 2 reports to compare trends. Click the eye icon to revisit a report in full.
      </p>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report, i) => {
          const isSelected = selectedForCompare.includes(report.id);
          const canSelect = selectedForCompare.length < 2 || isSelected;
          const reportDate = parseReportDate(report.created_at);
          const dateStr = reportDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          const timeStr = reportDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`zen-glass-solid p-5 relative group transition-all ${isSelected ? 'ring-2' : ''}`}
              style={{
                borderRadius: '18px',
                ...(isSelected ? { ringColor: 'var(--zen-brand-solid)', borderColor: 'var(--zen-brand-solid)' } : {}),
              }}
            >
              {/* Checkbox for compare */}
              <button
                onClick={() => canSelect && handleToggleCompare(report.id)}
                disabled={!canSelect}
                className={`absolute top-4 right-4 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                  isSelected ? 'border-[var(--zen-brand-solid)]' : 'border-gray-300 hover:border-gray-400'
                } ${!canSelect ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                style={isSelected ? { background: 'var(--zen-brand-solid)' } : {}}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Date & Time */}
              <div className="flex items-center mb-3">
                <Calendar className="w-3.5 h-3.5 mr-1.5" style={{ color: 'var(--zen-text-faint)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--zen-text-faint)' }}>{dateStr}</span>
                <span className="mx-2 text-xs" style={{ color: 'var(--zen-text-faint)' }}>•</span>
                <span className="text-xs" style={{ color: 'var(--zen-text-faint)' }}>{timeStr}</span>
              </div>

              {/* Score */}
              <div className="flex items-end gap-3 mb-3">
                <span className="text-4xl font-black" style={{ color: 'var(--zen-text)' }}>{report.health_score}</span>
                <span className="text-sm font-semibold mb-1" style={{ color: 'var(--zen-brand-solid)' }}>{report.health_grade}</span>
              </div>

              {/* Summary */}
              <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: 'var(--zen-text-muted)' }}>
                {report.health_summary || 'Report analysis available.'}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => onViewReport(report)}
                  className="zen-btn-ghost flex items-center"
                  style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Full Report
                </button>
                <button
                  onClick={() => handleDownloadReportPdf(report)}
                  disabled={downloadingId === report.id}
                  className="zen-btn-ghost flex items-center disabled:opacity-50"
                  style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                >
                  {downloadingId === report.id ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Downloading…</>
                  ) : (
                    <><Download className="w-3.5 h-3.5 mr-1" /> Download PDF</>
                  )}
                </button>
                <button
                  onClick={() => handleDeleteReport(report)}
                  disabled={deletingId === report.id}
                  className="zen-btn-ghost flex items-center disabled:opacity-50"
                  style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                >
                  {deletingId === report.id ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Deleting…</>
                  ) : (
                    <><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete</>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
