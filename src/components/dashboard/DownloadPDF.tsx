'use client';

import { useState } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { apiUrl } from '../../lib/api';

export default function DownloadPDF({ analysisData }: { analysisData: any }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  const handleDownload = async () => {
    setStatus('loading');
    try {
      const res = await fetch(apiUrl('/export/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: analysisData,
          patient_name: 'Patient',
          age: analysisData.patient_age || 30,
          gender: analysisData.patient_gender || 'M',
        }),
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ClariMed_Report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('PDF download error:', err);
      setStatus('idle');
    }
  };

  return (
    <button
      className="zen-btn-primary w-full"
      onClick={handleDownload}
      disabled={status === 'loading'}
      style={{
        padding: '14px 24px',
        borderRadius: '16px',
        fontSize: '0.875rem',
        opacity: status === 'loading' ? 0.7 : 1,
      }}
    >
      {status === 'loading' ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Generating PDF…
        </>
      ) : status === 'done' ? (
        <>
          <Check className="w-5 h-5" />
          Downloaded!
        </>
      ) : (
        <>
          <Download className="w-5 h-5" />
          Download PDF Report
        </>
      )}
    </button>
  );
}
