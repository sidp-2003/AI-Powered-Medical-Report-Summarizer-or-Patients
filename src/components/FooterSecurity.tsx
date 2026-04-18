import { ShieldCheck, Lock } from "lucide-react";

export default function FooterSecurity() {
  return (
    <footer className="w-full bg-black relative z-30 pt-32 pb-16 px-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
        <div className="flex gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-3xl font-medium text-white mb-4">
          Trust & Security
        </h2>
        <p className="text-xl text-white/50 font-light max-w-lg leading-relaxed mb-6">
          Your health data is yours. <br />
          <span className="text-white">Encrypted, secure, and entirely private.</span>
        </p>
        <div className="flex items-center gap-6 text-xs text-white/30 uppercase tracking-widest font-semibold mt-12">
          <span>Bank-Grade Encryption</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>HIPAA Compliant</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span>SOC 2 Type II</span>
        </div>
      </div>
    </footer>
  );
}
