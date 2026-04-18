'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Bot, Loader2, Mic, MicOff } from 'lucide-react';
import { apiUrl } from '../../lib/api';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ExplainRequest {
  id: number;
  content: string;
}

const VOICE_LANG_MAP: Record<string, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Tamil: 'ta-IN',
  Telugu: 'te-IN',
  Bengali: 'bn-IN',
};

const SUPPORTED_VOICE_INPUT_LANGUAGES = new Set(['English', 'Hindi', 'Marathi']);

const getVoiceRecognitionLanguage = (uiLanguage: string) => {
  if (SUPPORTED_VOICE_INPUT_LANGUAGES.has(uiLanguage)) {
    return VOICE_LANG_MAP[uiLanguage] || 'en-US';
  }
  return 'en-US';
};

const CHAT_UI_TEXT: Record<string, Record<string, string>> = {
  greeting: {
    English: "Hi! I'm your ClariMed health assistant. I can help explain your test results, suggest lifestyle changes, and answer medical questions based on your report. How can I help you today?",
    Hindi: 'नमस्ते! मैं आपका ClariMed स्वास्थ्य सहायक हूँ। मैं आपकी रिपोर्ट के आधार पर टेस्ट परिणाम समझाने, जीवनशैली सुझाव देने और स्वास्थ्य संबंधी सवालों में मदद कर सकता हूँ। मैं आपकी कैसे मदद करूँ?',
    Marathi: 'नमस्कार! मी तुमचा ClariMed आरोग्य सहाय्यक आहे. तुमच्या रिपोर्टवर आधारित चाचणी निकाल समजावून सांगणे, जीवनशैलीबद्दल सूचना देणे आणि वैद्यकीय प्रश्नांची उत्तरे देण्यात मी मदत करू शकतो. मी तुमची कशी मदत करू?',
    Tamil: 'வணக்கம்! நான் உங்கள் ClariMed சுகாதார உதவியாளர். உங்கள் அறிக்கையை அடிப்படையாகக் கொண்டு பரிசோதனை முடிவுகளை விளக்கவும், வாழ்க்கைமுறை ஆலோசனைகள் வழங்கவும், மருத்துவ கேள்விகளுக்கு பதில் அளிக்கவும் உதவுவேன். எப்படி உதவலாம்?',
    Telugu: 'నమస్కారం! నేను మీ ClariMed ఆరోగ్య సహాయకుడిని. మీ రిపోర్ట్ ఆధారంగా పరీక్ష ఫలితాలను వివరించడం, జీవనశైలి సూచనలు ఇవ్వడం, వైద్య ప్రశ్నలకు సమాధానాలు చెప్పడంలో సహాయం చేస్తాను. నేను ఎలా సహాయపడగలను?',
    Bengali: 'নমস্কার! আমি আপনার ClariMed স্বাস্থ্য সহকারী। আপনার রিপোর্টের ভিত্তিতে টেস্টের ফল বুঝতে, জীবনযাপনের পরামর্শ দিতে এবং স্বাস্থ্যসংক্রান্ত প্রশ্নের উত্তর দিতে সাহায্য করতে পারি। কীভাবে সাহায্য করতে পারি?',
  },
  chatWith: {
    English: 'Chat with ClariMed',
    Hindi: 'ClariMed से चैट करें',
    Marathi: 'ClariMed शी चॅट करा',
    Tamil: 'ClariMed உடன் அரட்டை',
    Telugu: 'ClariMed తో చాట్ చేయండి',
    Bengali: 'ClariMed এর সাথে চ্যাট করুন',
  },
  online: {
    English: 'Online',
    Hindi: 'ऑनलाइन',
    Marathi: 'ऑनलाइन',
    Tamil: 'ஆன்லைன்',
    Telugu: 'ఆన్‌లైన్',
    Bengali: 'অনলাইন',
  },
  askPlaceholder: {
    English: 'Ask about your report...',
    Hindi: 'अपनी रिपोर्ट के बारे में पूछें...',
    Marathi: 'तुमच्या रिपोर्टबद्दल विचारा...',
    Tamil: 'உங்கள் அறிக்கையை பற்றி கேளுங்கள்...',
    Telugu: 'మీ రిపోర్ట్ గురించి అడగండి...',
    Bengali: 'আপনার রিপোর্ট সম্পর্কে জিজ্ঞাসা করুন...',
  },
  close: {
    English: 'Close chat',
    Hindi: 'चैट बंद करें',
    Marathi: 'चॅट बंद करा',
    Tamil: 'அரட்டை மூடு',
    Telugu: 'చాట్ మూసివేయండి',
    Bengali: 'চ্যাট বন্ধ করুন',
  },
  startVoice: {
    English: 'Start voice input',
    Hindi: 'वॉइस इनपुट शुरू करें',
    Marathi: 'व्हॉइस इनपुट सुरू करा',
    Tamil: 'குரல் உள்ளீடு தொடங்கவும்',
    Telugu: 'వాయిస్ ఇన్‌పుట్ ప్రారంభించండి',
    Bengali: 'ভয়েস ইনপুট শুরু করুন',
  },
  stopVoice: {
    English: 'Stop voice input',
    Hindi: 'वॉइस इनपुट रोकें',
    Marathi: 'व्हॉइस इनपुट थांबवा',
    Tamil: 'குரல் உள்ளீட்டை நிறுத்தவும்',
    Telugu: 'వాయిస్ ఇన్‌పుట్ ఆపండి',
    Bengali: 'ভয়েস ইনপুট বন্ধ করুন',
  },
  listening: {
    English: 'Listening... speak now.',
    Hindi: 'सुन रहा है... अब बोलें।',
    Marathi: 'ऐकत आहे... आता बोला.',
    Tamil: 'கேட்கிறது... இப்போது பேசுங்கள்.',
    Telugu: 'వింటోంది... ఇప్పుడు మాట్లాడండి.',
    Bengali: 'শুনছে... এখন বলুন।',
  },
};

const getChatText = (language: string, key: string) => {
  const dictionary = CHAT_UI_TEXT[key];
  if (!dictionary) return key;
  return dictionary[language] || dictionary.English || key;
};

function renderChatMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        
        let isBullet = false;
        let isHeading = false;
        let isEmphasisLine = false;
        let cleanLine = line;

        const trimmed = line.trim();

        // Markdown headings (e.g., ### Title)
        if (/^#{1,6}\s+/.test(trimmed)) {
          isHeading = true;
          cleanLine = trimmed.replace(/^#{1,6}\s+/, '');
        }
        
        // Check if line starts with bullet
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          isBullet = true;
          cleanLine = trimmed.substring(2);
        }

        // Single italic/emphasis line wrapper (e.g., *Please remember ...*)
        if (/^\*[^*].*\*$/.test(trimmed) && !isBullet) {
          isEmphasisLine = true;
          cleanLine = trimmed.replace(/^\*/, '').replace(/\*$/, '');
        }
        
        // Parse bold
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const mappedParts = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold text-[color:var(--zen-text)]">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 items-start ml-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-40" />
              <span>{mappedParts}</span>
            </div>
          );
        }

        if (isHeading) {
          return (
            <div key={i} className="font-semibold text-[color:var(--zen-text)] pt-1">
              {mappedParts}
            </div>
          );
        }

        if (isEmphasisLine) {
          return (
            <div key={i} className="italic">
              {mappedParts}
            </div>
          );
        }
        
        return <div key={i}>{mappedParts}</div>;
      })}
    </div>
  );
}

export default function ChatWidget({ analysisData, explainRequest, uiLanguage = 'English' }: { analysisData: any; explainRequest?: ExplainRequest | null; uiLanguage?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef('');
  const lastExplainRequestIdRef = useRef<number | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: getChatText(uiLanguage, 'greeting')
        }
      ]);
    }
  }, [isOpen, messages.length, uiLanguage]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const startVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    setVoiceError(null);
    baseInputRef.current = inputMsg ? `${inputMsg.trimEnd()} ` : '';

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = getVoiceRecognitionLanguage(uiLanguage);
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += event.results[i][0].transcript;
        }
        setInputMsg(`${baseInputRef.current}${transcript}`.trimStart());
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const message = event?.error === 'not-allowed'
          ? 'Microphone permission denied. Please allow microphone access.'
          : 'Voice input failed. Please try again.';
        setVoiceError(message);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.lang = getVoiceRecognitionLanguage(uiLanguage);

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopVoiceInput = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
  };

  const sendPrompt = async (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isTyping) return;

    const newMsg: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, newMsg]);
    setInputMsg('');
    setIsTyping(true);

    try {
      const res = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages,
          context: analysisData || {}
        })
      });
      
      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    await sendPrompt(inputMsg);
  };

  useEffect(() => {
    if (!explainRequest?.id || !explainRequest?.content) return;
    if (lastExplainRequestIdRef.current === explainRequest.id) return;

    lastExplainRequestIdRef.current = explainRequest.id;
    setIsOpen(true);

    const prompt = `Please explain this predicted condition in simple terms for a patient in ${uiLanguage}: ${explainRequest.content}. Include: what it means, common causes, warning signs, what to do next, and what questions to ask the doctor.`;

    const run = async () => {
      await sendPrompt(prompt);
    };
    run();
  }, [explainRequest, uiLanguage]);

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--zen-brand-solid)', color: 'white' }}
          >
            <MessageCircle className="w-8 h-8" />
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-[80px] bg-white text-gray-800 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg whitespace-nowrap"
                >
                  {getChatText(uiLanguage, 'chatWith')}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[460px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-140px)] rounded-3xl overflow-hidden flex flex-col z-50 zen-glass-solid"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shadow-sm" style={{ background: 'var(--zen-brand)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm">
                  <span className="text-xl">🩺</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--zen-brand-text)' }}>ClariMed</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--zen-brand-text)', opacity: 0.8 }}>{getChatText(uiLanguage, 'online')}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-sm"
                aria-label={getChatText(uiLanguage, 'close')}
                title={getChatText(uiLanguage, 'close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: 'var(--zen-bg-warm)' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-white' : ''}`}
                    style={msg.role === 'model' ? { background: 'var(--zen-brand-solid)', color: 'white' } : { color: 'var(--zen-text)' }}
                  >
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div 
                    className={`px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-2xl rounded-tr-sm text-white shadow-md' : 'rounded-2xl rounded-tl-sm bg-white shadow-sm'}`}
                    style={msg.role === 'user' ? { background: 'var(--zen-text)' } : { color: 'var(--zen-text-secondary)' }}
                  >
                    {msg.role === 'model' ? renderChatMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm text-white" style={{ background: 'var(--zen-brand-solid)' }}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white shadow-sm flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                  </div>
                </div>
              )}
              
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t" style={{ borderColor: 'var(--zen-border)' }}>
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-end gap-2 relative bg-gray-100 rounded-2xl p-1"
              >
                <textarea
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={getChatText(uiLanguage, 'askPlaceholder')}
                  className="w-full bg-transparent resize-none outline-none py-3 pl-4 pr-1 text-sm max-h-32"
                  style={{ color: 'var(--zen-text)' }}
                  rows={1}
                />
                <button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center mb-1 transition-colors"
                  style={{
                    background: isListening ? '#EF4444' : '#E5E7EB',
                    color: isListening ? 'white' : '#4B5563'
                  }}
                  title={isListening ? getChatText(uiLanguage, 'stopVoice') : getChatText(uiLanguage, 'startVoice')}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || isTyping}
                  className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center mb-1 mr-1 transition-colors"
                  style={{ 
                    background: inputMsg.trim() && !isTyping ? 'var(--zen-brand-solid)' : '#D1D5DB', 
                    color: 'white' 
                  }}
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-[11px]" style={{ color: 'var(--zen-text-faint)' }}>
                  Voice: English / Hindi / Marathi
                </p>
                {(isListening || voiceError) && (
                  <p className="text-xs text-right" style={{ color: voiceError ? '#DC2626' : 'var(--zen-text-muted)' }}>
                    {voiceError || getChatText(uiLanguage, 'listening')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
