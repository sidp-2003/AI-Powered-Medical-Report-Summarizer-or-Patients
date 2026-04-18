"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { MapPin, Star, Calendar } from "lucide-react";

const doctors = [
  { name: "Dr. Elena Rostova", spec: "Cardiologist", dist: "1.2 miles away", rating: "4.9" },
  { name: "Dr. Marcus Chen", spec: "Internal Medicine", dist: "2.5 miles away", rating: "4.8" },
  { name: "Dr. Sarah Jenkins", spec: "Dietitian", dist: "3.0 miles away", rating: "5.0" }
];

export default function LocalCare() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Fade in the black overlay to hide the sequence
  const bgOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0.3, 0.4, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="w-full h-[300vh] relative z-20 pointer-events-none">
      
      {/* Background fade to true black */}
      <motion.div 
        className="sticky top-0 left-0 w-full h-screen bg-black -z-10"
        style={{ opacity: bgOpacity }}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6 pt-32 pb-12">
          <motion.div 
            style={{ opacity: contentOpacity }}
            className="w-full max-w-5xl pointer-events-auto"
          >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 tracking-tight">
              Take the <span className="text-emerald-400">Next Step.</span>
            </h2>
            <p className="text-xl font-light text-white/50 max-w-2xl mx-auto">
              Based on your panel, we've identified top-rated specialists in your immediate vicinity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {doctors.map((doc, i) => (
              <div key={i} className="glass-panel p-6 rounded-3xl flex flex-col hover:border-white/20 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-xl font-medium text-white/70">
                    {doc.name.split(" ")[1][0]}{doc.name.split(" ")[2][0]}
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md text-xs font-medium text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {doc.rating}
                  </div>
                </div>
                <h3 className="text-xl font-medium text-white mb-1">{doc.name}</h3>
                <p className="text-emerald-400 text-sm mb-4">{doc.spec}</p>
                <div className="flex items-center gap-2 text-white/40 text-xs mb-8">
                  <MapPin className="w-3 h-3" />
                  {doc.dist}
                </div>
                <button className="mt-auto w-full py-3 rounded-xl bg-white text-black font-medium text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
                  <Calendar className="w-4 h-4" />
                  Book Consultation
                </button>
              </div>
            ))}
          </div>
        </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
