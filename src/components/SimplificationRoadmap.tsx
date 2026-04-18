"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function SimplificationRoadmap() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scrollStage = useTransform(scrollYProgress, [0.2, 0.3, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="w-full h-[300vh] relative">
      <div className="sticky top-0 left-0 w-full h-screen flex flex-col items-center justify-center px-6 pt-32 pb-12">
        
        <motion.div 
          style={{ opacity: scrollStage }}
          className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 pointer-events-auto"
        >
          {/* Card 1: Simplistic Analysis */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col justify-center">
            <h3 className="text-white/80 font-medium mb-6 uppercase tracking-wider text-sm">Simplistic Analysis</h3>
            
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 font-mono text-sm mb-1">Raw Report Data</p>
                <p className="text-white font-medium">"Hypercholesterolemia with elevated LDL-C (180 mg/dL)"</p>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="text-white/30 w-6 h-6 rotate-90 md:rotate-0" />
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 font-mono text-sm mb-1">Aura Translation</p>
                <p className="text-white font-medium">"You have high bad cholesterol. It's time to reduce saturated fats."</p>
              </div>
            </div>
          </div>

          {/* Card 2: Recovery Roadmap */}
          <div className="glass-panel p-8 rounded-3xl">
            <h3 className="text-white/80 font-medium mb-6 uppercase tracking-wider text-sm">Your Recovery Roadmap</h3>
            
            <div className="relative border-l border-white/10 ml-3 space-y-8 py-2">
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-emerald-500 rounded-full left-[-6px] top-1.5 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <h4 className="text-white font-medium mb-1">Week 1: Dietary Shift</h4>
                <p className="text-white/50 text-sm">Replace red meat with lean proteins.</p>
              </div>
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-emerald-500 rounded-full left-[-6px] top-1.5" />
                <h4 className="text-white font-medium mb-1">Week 4: Re-Testing</h4>
                <p className="text-white/50 text-sm">Schedule a follow-up lipid panel.</p>
              </div>
              <div className="relative pl-6">
                <div className="absolute w-3 h-3 bg-emerald-500/30 border border-emerald-500 rounded-full left-[-6px] top-1.5" />
                <h4 className="text-white/70 font-medium mb-1">Month 3: Evaluation</h4>
                <p className="text-white/40 text-sm">Review progress with primary care.</p>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
