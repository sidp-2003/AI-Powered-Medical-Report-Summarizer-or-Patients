"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 w-full z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto backdrop-blur-md bg-black/20 border border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <Activity className="w-5 h-5 text-emerald-500 group-hover:text-emerald-400 transition-colors" />
          <span className="font-semibold text-white tracking-wide">ClariMed</span>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-6">
          <Link href="/auth">
            <button className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Log In
            </button>
          </Link>
          <Link href="/auth">
            <button className="text-sm font-medium bg-white text-black px-5 py-2 rounded-full hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Sign Up
            </button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
