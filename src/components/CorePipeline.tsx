"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { CopyPlus, ActivitySquare, FileText } from "lucide-react";

export default function CorePipeline() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0.2, 0.3, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="w-full h-[300vh] relative pointer-events-none">
      <div className="sticky top-0 left-0 w-full h-screen flex flex-col items-center justify-center px-6 pt-32 pb-12 pointer-events-auto">
        <motion.div 
          style={{ opacity }}
          className="w-full max-w-6xl"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-[45%] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />

            {/* Step 1 */}
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                <CopyPlus className="w-8 h-8 text-white/80" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">1. Upload</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Securely drop your raw medical reports, lab results, or imaging summaries into our high-compliance vault.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center translate-y-0 md:translate-y-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                <ActivitySquare className="w-8 h-8 text-emerald-400 z-10" />
                <motion.div 
                  className="absolute inset-0 bg-emerald-500/10" 
                  animate={{ y: ["-100%", "100%"] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }} 
                />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">2. Analyze</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Our proprietary neural engine scans, correlates, and extracts key biological markers from dense clinical jargon.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-white/80" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">3. Report</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Instantly receive a clear, plain-English summary of your health, complete with actionable recovery steps.
              </p>
            </div>
            
          </div>
        </motion.div>
      </div>
    </section>
  );
}
