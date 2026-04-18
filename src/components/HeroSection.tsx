"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full"
      >
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-white mb-6 leading-tight">
          Your Health. <br className="hidden md:block" />
          <span className="text-white/60">Decoded.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-light leading-relaxed mb-12">
          We believe you shouldn't need a medical degree to understand your own body.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/auth">
            <motion.button 
              whileHover={{ scale: 1.03 }}
              className="bg-white text-black rounded-full px-8 py-4 font-semibold text-base"
            >
              Analyze My Report →
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
