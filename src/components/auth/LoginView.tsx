import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../config/appConfig';

interface LoginViewProps {
  onOpenSupabaseGuide: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenSupabaseGuide }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Silakan masukkan alamat email akun Anda.');
      return;
    }
    if (!password) {
      setError('Silakan masukkan kata sandi (password) Anda.');
      return;
    }

    setError(null);
    setLoading(true);

    const res = await login(email.trim(), password);
    if (!res.success) {
      setError(res.message || 'Email atau kata sandi yang Anda masukkan tidak sesuai.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-8 text-white text-center relative">
          <div className="w-20 h-20 bg-white/95 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-md p-1.5 ring-1 ring-white/30">
            <img
              src={APP_CONFIG.logoUrl}
              alt="Little Star Learning Center"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{APP_CONFIG.name}</h1>
          <p className="text-emerald-100 text-xs mt-1">
            {APP_CONFIG.tagline}
          </p>
        </div>

        {/* Form Login Resmi Berbasis Email */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500">
              Gunakan alamat email terdaftar dan kata sandi Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Alamat Email Akun *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: admin@littlestar.id atau wali@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Kata Sandi (Password) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed animate-in fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Memverifikasi Email & Sandi...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bantuan & Informasi Kontak */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <p className="text-2xs text-slate-500">
              Belum memiliki akun atau lupa kata sandi?
              <br />
              Silakan hubungi bagian <strong>Administrasi {APP_CONFIG.name}</strong>.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenSupabaseGuide}
                className="inline-flex items-center gap-1.5 text-3xs text-slate-400 hover:text-emerald-700 transition-colors font-medium cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Konfigurasi Database Supabase & File SQL</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
