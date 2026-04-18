"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function AiBreakdown() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Stays on screen longer: fades in early, stays up to 0.8, fades out late
  const opacity = useTransform(scrollYProgress, [0.2, 0.4, 0.8, 0.9], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0.2, 0.4, 0.8, 0.9], [50, 0, 0, -50]);

  return (
    <section ref={ref} className="w-full h-[300vh] relative pointer-events-none">
      <div className="sticky top-0 left-0 w-full h-screen flex items-center justify-center pt-32 pb-12">
        <motion.div
          style={{ opacity, y }}
          className="text-center px-6 max-w-3xl"
        >
          <h2 className="text-4xl md:text-6xl font-semibold text-white mb-4 tracking-tight">
            Advanced AI Analysis.
          </h2>
          <p className="text-xl md:text-3xl font-light text-white/50 leading-relaxed">
            Unlocking the data hidden in your bloodwork.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
