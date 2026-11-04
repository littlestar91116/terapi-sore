import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Konfigurasi Project Supabase Little Star Learning Center
export const DEFAULT_SUPABASE_URL = 'https://vidrunwbsafcsyksnidk.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_7ZlGcyHakiLu94Q-XWfWZQ_Xq29n6Fk';

// Ambil URL dan Anon Key dari environment variable Vite atau default project
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Penyimpanan key lokal jika user memasukkan via form konfigurasi UI
const LOCAL_STORAGE_KEY_URL = 'terapi_supabase_url';
const LOCAL_STORAGE_KEY_ANON = 'terapi_supabase_anon';

export function getStoredSupabaseConfig() {
  let url = localStorage.getItem(LOCAL_STORAGE_KEY_URL) || ENV_SUPABASE_URL;
  let key = localStorage.getItem(LOCAL_STORAGE_KEY_ANON) || ENV_SUPABASE_ANON_KEY;

  // Jika masih tersimpan placeholder lama di browser, alihkan ke kredensial proyek aktif
  if (!url || url === 'https://your-project.supabase.co') {
    url = DEFAULT_SUPABASE_URL;
  }
  if (!key || key === 'your-anon-key-here') {
    key = DEFAULT_SUPABASE_ANON_KEY;
  }

  return {
    url: url.trim(),
    key: key.trim(),
    isEnvProvided: true,
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (url && key) {
    localStorage.setItem(LOCAL_STORAGE_KEY_URL, url.trim());
    localStorage.setItem(LOCAL_STORAGE_KEY_ANON, key.trim());
    initSupabaseClient();
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY_URL);
    localStorage.removeItem(LOCAL_STORAGE_KEY_ANON);
    supabaseInstance = null;
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function initSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.key || config.url === 'https://your-project.supabase.co') {
    supabaseInstance = null;
    return null;
  }

  try {
    supabaseInstance = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseInstance;
  } catch (error) {
    console.warn('Gagal menginisialisasi client Supabase:', error);
    supabaseInstance = null;
    return null;
  }
}

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance) {
    initSupabaseClient();
  }
  return supabaseInstance;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; profileCount?: number }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'Kredensial Supabase (URL / Anon Key) belum diisi.',
    };
  }

  try {
    const { count: profileCount, error: profileErr } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (profileErr) {
      const currentUrl = getStoredSupabaseConfig().url;
      if (profileErr.message?.toLowerCase().includes('schema cache') || profileErr.message?.toLowerCase().includes('does not exist')) {
        return {
          success: true,
          message: `Koneksi ke project Supabase (${currentUrl}) BERHASIL terhubung! Database masih baru dan tabel belum dibuat. Silakan klik tombol 'Salin Schema SQL' di bawah dan jalankan pada SQL Editor di Dashboard Supabase Anda.`,
          profileCount: 0,
        };
      }
      return {
        success: false,
        message: `Terhubung ke Supabase namun query tabel profiles gagal: ${profileErr.message}. Pastikan schema.sql versi terbaru sudah dijalankan di SQL Editor.`,
      };
    }

    return {
      success: true,
      message: `Koneksi Supabase aktif dan berhasil! Ditemukan ${profileCount ?? 0} akun pengguna di tabel profiles.`,
      profileCount: profileCount ?? 0,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menghubungi server Supabase: ${errorMsg}`,
    };
  }
}
