'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, ShieldAlert, TrendingUp, HeartPulse } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { apiUrl } from '../../lib/api';

interface CompareViewProps {
  reports: [any, any];
  onBack: () => void;
}

export default function CompareView({ reports, onBack }: CompareViewProps) {
  const [comparisonText, setComparisonText] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Define which ones are Older / Newer
  const r1Date = new Date(reports[0].created_at).getTime();
  const r2Date = new Date(reports[1].created_at).getTime();
  
  const olderReport = r1Date < r2Date ? reports[0] : reports[1];
  const newerReport = r1Date > r2Date ? reports[0] : reports[1];

  const oldDateStr = new Date(olderReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const newDateStr = new Date(newerReport.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    // Fetch comparison text
    async function fetchComparison() {
      try {
        const res = await fetch(apiUrl('/compare'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report1_id: olderReport.id,
            report2_id: newerReport.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          setComparisonText(data.comparison);
        }
      } catch (err) {
        console.error("Failed to load compare text", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchComparison();
  }, [olderReport.id, newerReport.id]);

  // Build Merged Data for Charts
  const oldTests = olderReport.tests || olderReport.all_tests || [];
  const newTests = newerReport.tests || newerReport.all_tests || [];
  
  // Create a map to merge tests
  const testMap = new Map<string, any>();
  oldTests.forEach((t: any) => {
    if (!testMap.has(t.test_name)) {
      testMap.set(t.test_name, { name: t.test_name, unit: t.unit, older: t.value });
    } else {
      testMap.get(t.test_name).older = t.value;
    }
  });
  newTests.forEach((t: any) => {
    if (!testMap.has(t.test_name)) {
      testMap.set(t.test_name, { name: t.test_name, unit: t.unit, newer: t.value });
    } else {
      testMap.get(t.test_name).newer = t.value;
    }
  });

  const chartData = Array.from(testMap.values()).filter(t => t.older !== undefined && t.newer !== undefined).slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen text-gray-900">
      
      {/* HeaderNav */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
        </button>
        <button onClick={() => window.print()} className="flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors">
          <Download className="w-4 h-4 mr-2" />
          Export Comparison PDF
        </button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">Report Comparison</h1>
        <p className="text-gray-500 font-medium">Tracking your progress from {oldDateStr} to {newDateStr}</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 opacity-50">
          <div className="w-8 h-8 border-4 border-[var(--zen-brand-solid)] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-[color:var(--zen-brand-solid)]">Analyzing progress...</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-emerald-800">What Improved</h3>
              </div>
              <ul className="space-y-3 text-emerald-900 text-sm">
                {comparisonText?.improved?.map((txt: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span>{txt.replace(/\*/g, '')}</span>
                  </li>
                )) || <p className="opacity-50">No significant improvements noted.</p>}
              </ul>
            </div>
            
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 relative overflow-hidden">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-amber-800">Areas to Monitor</h3>
              </div>
              <ul className="space-y-3 text-amber-900 text-sm">
                {comparisonText?.declined?.map((txt: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="mr-2 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span>{txt.replace(/\*/g, '')}</span>
                  </li>
                )) || <p className="opacity-50">No negative trends noted.</p>}
              </ul>
            </div>
          </div>

          {/* Graphical Trends */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center">
              <HeartPulse className="w-5 h-5 mr-2 text-[var(--zen-brand-solid)]" />
              Biomarker Shifts
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="older" name={`Older (${oldDateStr})`} fill="#D1D5DB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="newer" name={`Newer (${newDateStr})`} fill="var(--zen-brand-solid)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Recommended Next Steps</h3>
            <ul className="space-y-4">
              {comparisonText?.next_steps?.map((txt: string, i: number) => (
                <li key={i} className="flex gap-4 p-4 rounded-xl bg-gray-50 text-sm text-gray-700">
                  <div className="w-6 h-6 rounded-full bg-[var(--zen-brand-solid)] text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
                    {i + 1}
                  </div>
                  <div>{txt.replace(/\*/g, '')}</div>
                </li>
              ))}
            </ul>
          </div>

        </motion.div>
      )}
    </div>
  );
}
