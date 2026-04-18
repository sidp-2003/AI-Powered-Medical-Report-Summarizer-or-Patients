'use client';

import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Dna, FileText } from 'lucide-react';
import AuthForm from '../../components/AuthForm';

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-black text-white md:grid md:grid-cols-2">
      {/* LEFT COLUMN */}
      <div className="flex flex-col justify-center p-8 md:p-16 lg:p-24 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Your health, decoded.</h1>
        <p className="text-xl text-white/70 mb-12">Upload any blood report and get plain-language insights in seconds.</p>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-4 text-white/90">
            <ShieldCheck className="w-6 h-6 text-white" />
            <span className="text-lg">Private by default</span>
          </div>
          <div className="flex items-center space-x-4 text-white/90">
            <Dna className="w-6 h-6 text-white" />
            <span className="text-lg">AI-powered analysis</span>
          </div>
          <div className="flex items-center space-x-4 text-white/90">
            <FileText className="w-6 h-6 text-white" />
            <span className="text-lg">Results in seconds</span>
          </div>
        </div>
      </div>
      
      {/* RIGHT COLUMN */}
      <div className="flex flex-col justify-center items-center p-8 bg-black">
        <AuthForm />
      </div>
    </div>
  );
}
