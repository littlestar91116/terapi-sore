import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  User,
  Shield,
  KeyRound,
  ArrowRight,
  Database,
  Briefcase,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginViewProps {
  onOpenSupabaseGuide: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenSupabaseGuide }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(username, password);
    if (!res.success) {
      setError(res.message || 'Login gagal');
    }
    setLoading(false);
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
    setLoading(true);
    const res = await login(u, p);
    if (!res.success) {
      setError(res.message || 'Login gagal');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-8 text-white text-center relative">
          <div className="w-14 h-14 bg-white/15 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner backdrop-blur-xs">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Klinik Terapi Siswa</h1>
          <p className="text-emerald-100 text-xs mt-1">
            Sistem Absensi, Jadwal, Saldo Jam & Keuangan SPP
          </p>
        </div>

        {/* Form Login */}
        <div className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-semibold"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memproses...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login Helper untuk evaluator */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Login Cepat Akun Demo:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', '12345')}
                className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-left font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <div>
                  <span className="block text-2xs font-bold">Admin Utama</span>
                  <span className="text-3xs text-purple-700">admin / 12345</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('kepala', '123')}
                className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-left font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <div>
                  <span className="block text-2xs font-bold">Kepala Terapi</span>
                  <span className="text-3xs text-sky-700">kepala / 123</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('guru', '123')}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-left font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block text-2xs font-bold">Guru Terapis</span>
                  <span className="text-3xs text-emerald-700">guru / 123</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('wali', '123')}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-left font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HeartHandshake className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="block text-2xs font-bold">Wali Murid</span>
                  <span className="text-3xs text-amber-700">wali / 123</span>
                </div>
              </button>
            </div>

            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => handleQuickLogin('wali_beku', '123')}
                className="text-3xs text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
              >
                Coba Login Sebagai Wali Murid Dibekukan (Tunggakan SPP)
              </button>
            </div>
          </div>

          {/* Panduan Supabase link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onOpenSupabaseGuide}
              className="inline-flex items-center gap-1 text-2xs text-slate-500 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Panduan Setup Database Supabase & File SQL</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
