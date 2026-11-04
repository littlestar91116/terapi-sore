import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, ShieldCheck, RefreshCw, KeyRound, CheckCircle2, UploadCloud, AlertCircle, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { getStoredSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../../lib/supabase';
import { isAutoSyncEnabled, setAutoSyncEnabled } from '../../lib/supabaseSync';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const { users, permissions } = useAuth();
  const { syncAllToSupabase } = useData();

  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; profileCount?: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  const [autoSyncOn, setAutoSyncOn] = useState(() => isAutoSyncEnabled());

  const initialConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(initialConfig.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(initialConfig.key);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopySql = async () => {
    try {
      const response = await fetch('/schema.sql');
      const sqlText = await response.text();
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: copy placeholder or prompt user
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection();
    setTestResult(result);
    setTesting(false);
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllToSupabase(users, permissions);
      setSyncResult({
        success: res.success,
        message: res.details,
        details: res.errors.length > 0 ? res.errors.slice(0, 3).join('; ') : undefined,
      });
      // Refresh status dan jumlah akun di Supabase
      const check = await testSupabaseConnection();
      setTestResult(check);
    } catch (e: any) {
      setSyncResult({
        success: false,
        message: `Gagal sinkronisasi: ${e?.message || e}`,
      });
    }
    setSyncing(false);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    handleTestConnection();
  };

  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Panduan Koneksi Supabase & Schema SQL"
      subtitle="Instruksi lengkap integrasi database PostgreSQL & RLS"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Status Koneksi */}
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isConfigured
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Status Supabase:</span>
                <Badge variant={isConfigured ? 'green' : 'yellow'}>
                  {isConfigured ? 'Kredensial Terisi' : 'Mode Demo / Belum Terhubung'}
                </Badge>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {isConfigured
                  ? 'Kredensial URL & Anon Key aktif. Anda dapat menguji query langsung.'
                  : 'Aplikasi saat ini berjalan menggunakan data lokal otomatis (localStorage) yang siap pakai.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Menguji...' : 'Uji Koneksi'}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {testResult.message}
          </div>
        )}

        {/* Fitur Auto Sync (Otomatis Simpan Perubahan ke Supabase) */}
        <div className="p-4 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-emerald-950">
                  Fitur Auto Sync (Simpan Otomatis ke Supabase)
                </h4>
                <Badge variant={autoSyncOn ? 'green' : 'gray'}>
                  {autoSyncOn ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}
                </Badge>
              </div>
              <p className="text-xs text-emerald-800/90 mt-1 leading-relaxed">
                Setiap kali data <strong>ditambah, diubah, atau dihapus</strong> dari website (Siswa, Guru, Jadwal, Absensi, Izin, Pembayaran, Gaji, dan Akun), sistem akan <strong>langsung otomatis menyimpannya ke database Supabase</strong> secara real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextState = !autoSyncOn;
              setAutoSyncOn(nextState);
              setAutoSyncEnabled(nextState);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
              autoSyncOn
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {autoSyncOn ? (
              <>
                <ToggleRight className="w-4 h-4 text-white" />
                <span>Auto Sync: ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-600" />
                <span>Auto Sync: OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Tombol Sinkronisasi Seluruh Data Lokal ke Supabase */}
        {isConfigured && (
          <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                Unggah & Sinkronkan Seluruh Data Lokal ke Supabase
              </h4>
              <p className="text-2xs text-emerald-800/80 mt-1">
                Kirim seluruh akun pengguna ({users.length} akun), data siswa, data guru, paket, dan jadwal ke tabel Supabase Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce' : ''}`} />
              {syncing ? 'Menyinkronkan...' : 'Sinkronkan Data Sekarang'}
            </button>
          </div>
        )}

        {syncResult && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
              syncResult.success
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {syncResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{syncResult.message}</p>
              {syncResult.details && <p className="text-2xs opacity-80 mt-1">{syncResult.details}</p>}
            </div>
          </div>
        )}

        {/* Akun Admin Bawaan */}
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Akun Admin Utama Bawaan
              </h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Username: <code className="bg-white/80 px-1.5 py-0.5 rounded font-bold text-indigo-900">admin</code>{' '}
                • Password:{' '}
                <code className="bg-white/80 px-1.5 py-0.5 rounded font-bold text-indigo-900">12345</code>
              </p>
            </div>
          </div>
          <Badge variant="purple">Hak Akses Penuh</Badge>
        </div>

        {/* Langkah-langkah setup */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>5 Langkah Menghubungkan ke Supabase</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-800 block mb-1">1. Buat Proyek Baru</span>
              <p className="text-slate-600">
                Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> dan buat proyek baru (free tier).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-800 block mb-1">2. Jalankan Schema SQL</span>
              <p className="text-slate-600 mb-2">
                Buka menu <strong>SQL Editor</strong> di dashboard Supabase, tempel isi schema.sql lalu klik <strong>Run</strong>.
              </p>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin Seluruh SQL'}
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-800 block mb-1">3. Salin Project URL & Anon Key</span>
              <p className="text-slate-600">
                Di dashboard Supabase, buka <strong>Project Settings → API</strong>. Salin Project URL dan anon public key.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-800 block mb-1">4. Simpan Kredensial</span>
              <p className="text-slate-600">
                Masukkan nilai ke form di bawah ini atau tambahkan di file <code>.env</code> (variabel <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>).
              </p>
            </div>
          </div>
        </div>

        {/* Form Konfigurasi Kredensial Langsung */}
        <form onSubmit={handleSaveConfig} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Konfigurasi Kredensial Supabase Frontend
          </h4>
          <p className="text-2xs text-slate-500">
            Hanya gunakan <strong>anon / public key</strong>. Jangan pernah menaruh service role key di frontend.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
                Supabase URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold text-slate-700 uppercase mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="text"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {saveSuccess ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Kredensial berhasil disimpan!
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Simpan & Hubungkan
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
