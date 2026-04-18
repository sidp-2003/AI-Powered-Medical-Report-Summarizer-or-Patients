"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { MessageSquare, Plus, Minus } from "lucide-react";

export default function ContinuousSupport() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Expanded stay
  const blurAmount = useTransform(scrollYProgress, [0.2, 0.3, 0.8, 0.9], [0, 8, 8, 0]);
  const opacity = useTransform(scrollYProgress, [0.2, 0.3, 0.8, 0.9], [0, 1, 1, 0]);

  return (
    <section ref={ref} className="w-full h-[300vh] relative z-10 pointer-events-none">
      
      {/* Dynamic Background Blur mapped to scroll */}
      <motion.div 
        className="sticky top-0 w-full h-screen -z-10 bg-black/10"
        style={{ backdropFilter: useTransform(blurAmount, v => `blur(${v}px)`) }}
      >
        <div className="absolute inset-0 flex items-center justify-center px-6 pt-32 pb-12">
          <motion.div 
            style={{ opacity }}
            className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 pointer-events-auto"
          >
          {/* Chatbot UI Mockup */}
          <div className="glass-panel p-6 rounded-3xl flex flex-col h-[400px]">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <MessageSquare className="text-emerald-400 w-5 h-5" />
              </div>
              <h3 className="text-white font-medium">Aura Assistant</h3>
            </div>
            
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="self-end bg-white/10 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm">
                What does high cholesterol mean for my diet?
              </div>
              <div className="self-start bg-emerald-500/10 border border-emerald-500/20 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm max-w-[90%] text-sm leading-relaxed">
                Based on your latest panel, you should reduce saturated fats. Specifically, try replacing butter with olive oil and choose lean poultry over red meat for at least 4 meals a week.
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
              <div className="flex-1 h-10 rounded-full bg-white/5 border border-white/10 flex items-center px-4">
                <span className="text-white/30 text-sm">Ask a follow-up question...</span>
              </div>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="p-4 flex flex-col justify-center gap-4">
            <h3 className="text-2xl font-semibold text-white mb-4">Common Questions</h3>
            <AccordionItem 
              question="How accurate is the AI translation?" 
              answer="Our models are trained on millions of clinical reports and validated by human physicians to ensure 99% accuracy in terminology mapping." 
              isOpen={true} 
            />
            <AccordionItem 
              question="Is my data shared with third parties?" 
              answer="Never. We use Bank-Grade encryption and do not sell or share your data." 
              isOpen={false} 
            />
            <AccordionItem 
              question="Can I share this with my primary doctor?" 
              answer="Yes, you can export a clinical summary directly to your provider's portal." 
              isOpen={false} 
            />
          </div>
        </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function AccordionItem({ question, answer, isOpen: defaultOpen }: { question: string, answer: string, isOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 bg-black/40 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="text-white font-medium text-sm">{question}</span>
        {open ? <Minus className="w-4 h-4 text-white/50" /> : <Plus className="w-4 h-4 text-white/50" />}
      </button>
      {open && (
        <div className="px-6 pb-4 text-white/50 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
