'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(false); // Default to signup usually from the toggle, I'll default to Sign Up
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!isLogin && !formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      localStorage.setItem(
        'medreport_user',
        JSON.stringify({ name: formData.name || formData.email, email: formData.email })
      );
      router.push('/dashboard');
    }, 800);
  };

  return (
    <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8">
      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8">
        <button
          type="button"
          onClick={() => { setIsLogin(false); setErrors({}); }}
          className={`flex-1 pb-3 text-center transition-colors ${!isLogin ? 'border-b-2 border-white text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => { setIsLogin(true); setErrors({}); }}
          className={`flex-1 pb-3 text-center transition-colors ${isLogin ? 'border-b-2 border-white text-white' : 'text-white/40 hover:text-white/70'}`}
        >
          Log In
        </button>
      </div>

      <form onSubmit={handleSubmit} className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'signup'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {!isLogin && (
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            )}
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email" // The simplest placeholder based on description
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            {!isLogin && (
              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/40"
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black rounded-lg py-3 font-semibold hover:bg-white/90 transition-colors mt-6 flex items-center justify-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : isLogin ? (
                'Continue'
              ) : (
                'Create Account'
              )}
            </button>
          </motion.div>
        </AnimatePresence>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => { setIsLogin(!isLogin); setErrors({}); }}
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          {isLogin ? "New here? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
