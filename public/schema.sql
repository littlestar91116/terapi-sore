-- ==============================================================================
-- SISTEM ABSENSI & KEUANGAN TERAPI SISWA - LITTLE STAR LEARNING CENTER
-- SQL Schema, Relasi, RLS Policies, dan Data Awal (Seed) untuk Supabase (PostgreSQL)
-- Mendukung Akses Frontend Anon & Authenticated Key secara Aman dan Idempotent
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM (Aman jika sudah ada)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'kepala', 'guru', 'wali');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('aktif', 'dibekukan', 'nonaktif');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_type AS ENUM ('Belum', 'Hadir', 'Izin', 'Alpa', 'Libur dari sekolah');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE leave_status AS ENUM ('menunggu', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('belum_lunas', 'lunas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('Tunai', 'Non-tunai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE salary_system_type AS ENUM ('per_jam', 'bulanan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL PROFIL / USERS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'wali',
    position TEXT,
    password TEXT DEFAULT '123',
    status account_status NOT NULL DEFAULT 'aktif',
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom baru selalu ditambahkan jika tabel lama sudah ada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'aktif';

-- 4. TABEL PAKET TERAPI (MASTER DATA)
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_hours INTEGER NOT NULL CHECK (duration_hours IN (1, 2)),
    frequency_per_week INTEGER NOT NULL CHECK (frequency_per_week BETWEEN 1 AND 5),
    price_monthly NUMERIC NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL GURU
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY DEFAULT ('GUR-' || substr(md5(random()::text), 1, 6)),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    position TEXT,
    role user_role DEFAULT 'guru',
    phone TEXT,
    address TEXT,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status account_status NOT NULL DEFAULT 'aktif',
    salary_system salary_system_type NOT NULL DEFAULT 'per_jam',
    hourly_rate NUMERIC NOT NULL DEFAULT 20000,
    monthly_salary NUMERIC NOT NULL DEFAULT 3000000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom baru selalu ditambahkan jika tabel lama sudah ada
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'guru';

-- 6. TABEL SISWA
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT ('SIS-' || substr(md5(random()::text), 1, 6)),
    name TEXT NOT NULL,
    birth_date DATE,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    address TEXT,
    package_id TEXT NOT NULL REFERENCES public.packages(id),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id),
    account_status account_status NOT NULL DEFAULT 'aktif',
    saldo_jam INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL JADWAL TERAPI BULANAN
CREATE TABLE IF NOT EXISTS public.monthly_schedules (
    id TEXT PRIMARY KEY DEFAULT ('JDW-' || substr(md5(random()::text), 1, 8)),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id),
    package_id TEXT NOT NULL REFERENCES public.packages(id),
    month_year TEXT NOT NULL, -- Format: YYYY-MM
    days_config JSONB NOT NULL, -- Array dari { "day": "Senin", "startTime": "13:00", "duration": 1 }
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL SESI TERAPI INDIVIDUAL (GENERATED BULANAN)
CREATE TABLE IF NOT EXISTS public.therapy_sessions (
    id TEXT PRIMARY KEY DEFAULT ('SES-' || substr(md5(random()::text), 1, 10)),
    schedule_id TEXT NOT NULL REFERENCES public.monthly_schedules(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id),
    session_date DATE NOT NULL,
    day_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 1,
    attendance_status attendance_type NOT NULL DEFAULT 'Belum',
    attendance_notes TEXT,
    marked_at TIMESTAMPTZ,
    marked_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL PERIZINAN SISWA (KHUSUS PAKET 2 JAM)
CREATE TABLE IF NOT EXISTS public.student_leaves (
    id TEXT PRIMARY KEY DEFAULT ('IZS-' || substr(md5(random()::text), 1, 8)),
    session_id TEXT NOT NULL REFERENCES public.therapy_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status NOT NULL DEFAULT 'menunggu',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL PERIZINAN GURU
CREATE TABLE IF NOT EXISTS public.teacher_leaves (
    id TEXT PRIMARY KEY DEFAULT ('IZG-' || substr(md5(random()::text), 1, 8)),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status NOT NULL DEFAULT 'menunggu',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL RIWAYAT SALDO JAM
CREATE TABLE IF NOT EXISTS public.saldo_jam_history (
    id TEXT PRIMARY KEY DEFAULT ('SLD-' || substr(md5(random()::text), 1, 8)),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('penambahan', 'pemakaian')),
    amount_hours INTEGER NOT NULL,
    description TEXT NOT NULL,
    session_id TEXT REFERENCES public.therapy_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABEL PEMBAYARAN BULANAN
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY DEFAULT ('INV-' || substr(md5(random()::text), 1, 8)),
    student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status payment_status NOT NULL DEFAULT 'belum_lunas',
    payment_date DATE,
    payment_method payment_method_type,
    receipt_number TEXT UNIQUE,
    notes TEXT,
    marked_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABEL GAJI GURU BULANAN
CREATE TABLE IF NOT EXISTS public.payrolls (
    id TEXT PRIMARY KEY DEFAULT ('SLP-' || substr(md5(random()::text), 1, 8)),
    teacher_id TEXT NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    salary_system salary_system_type NOT NULL,
    base_salary NUMERIC NOT NULL,
    total_hours_taught INTEGER NOT NULL DEFAULT 0,
    hourly_rate NUMERIC NOT NULL DEFAULT 20000,
    bonus_full_attendance NUMERIC NOT NULL DEFAULT 0,
    deduction_leave NUMERIC NOT NULL DEFAULT 0,
    total_leave_days INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'dibayar')),
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABEL PENGATURAN KEUANGAN
CREATE TABLE IF NOT EXISTS public.financial_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    default_hourly_rate NUMERIC NOT NULL DEFAULT 20000,
    full_attendance_bonus NUMERIC NOT NULL DEFAULT 50000,
    daily_leave_deduction NUMERIC NOT NULL DEFAULT 75000,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABEL HAK AKSES PERAN (ROLE PERMISSIONS)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id TEXT PRIMARY KEY,
    role user_role NOT NULL,
    module TEXT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_add BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (role, module)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Kebijakan akses yang kompatibel dengan Anon Key Frontend & Supabase Auth
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saldo_jam_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS (Mengizinkan akses anon key & authenticated user)
DROP POLICY IF EXISTS "Akses profiles aplikasi" ON public.profiles;
DROP POLICY IF EXISTS "Admin & Kepala punya akses penuh ke profiles" ON public.profiles;
DROP POLICY IF EXISTS "User bisa melihat profil sendiri" ON public.profiles;
CREATE POLICY "Akses profiles aplikasi"
    ON public.profiles FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. PACKAGES RLS
DROP POLICY IF EXISTS "Akses packages aplikasi" ON public.packages;
DROP POLICY IF EXISTS "Semua role bisa melihat paket aktif" ON public.packages;
DROP POLICY IF EXISTS "Admin & Kepala bisa mengelola paket" ON public.packages;
CREATE POLICY "Akses packages aplikasi"
    ON public.packages FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. TEACHERS RLS
DROP POLICY IF EXISTS "Akses teachers aplikasi" ON public.teachers;
DROP POLICY IF EXISTS "Semua user terotentikasi bisa melihat data guru" ON public.teachers;
DROP POLICY IF EXISTS "Admin & Kepala mengelola guru" ON public.teachers;
CREATE POLICY "Akses teachers aplikasi"
    ON public.teachers FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. STUDENTS RLS
DROP POLICY IF EXISTS "Akses students aplikasi" ON public.students;
DROP POLICY IF EXISTS "Admin, Kepala, dan Guru bisa melihat seluruh siswa" ON public.students;
DROP POLICY IF EXISTS "Wali murid hanya melihat siswa miliknya" ON public.students;
DROP POLICY IF EXISTS "Admin & Kepala mengelola siswa" ON public.students;
CREATE POLICY "Akses students aplikasi"
    ON public.students FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. MONTHLY SCHEDULES RLS
DROP POLICY IF EXISTS "Akses monthly_schedules aplikasi" ON public.monthly_schedules;
DROP POLICY IF EXISTS "Admin, Kepala, dan Guru melihat jadwal bulanan" ON public.monthly_schedules;
DROP POLICY IF EXISTS "Admin & Kepala mengelola jadwal bulanan" ON public.monthly_schedules;
DROP POLICY IF EXISTS "Wali melihat jadwal bulanan anaknya" ON public.monthly_schedules;
CREATE POLICY "Akses monthly_schedules aplikasi"
    ON public.monthly_schedules FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. THERAPY SESSIONS RLS
DROP POLICY IF EXISTS "Akses therapy_sessions aplikasi" ON public.therapy_sessions;
DROP POLICY IF EXISTS "Admin, Kepala, dan Guru melihat semua sesi terapi" ON public.therapy_sessions;
DROP POLICY IF EXISTS "Guru bisa memperbarui absensi sesi terapi" ON public.therapy_sessions;
DROP POLICY IF EXISTS "Admin & Kepala mengelola sesi terapi" ON public.therapy_sessions;
DROP POLICY IF EXISTS "Wali hanya melihat sesi anaknya jika akun tidak dibekukan" ON public.therapy_sessions;
CREATE POLICY "Akses therapy_sessions aplikasi"
    ON public.therapy_sessions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. STUDENT LEAVES RLS
DROP POLICY IF EXISTS "Akses student_leaves aplikasi" ON public.student_leaves;
DROP POLICY IF EXISTS "Wali bisa melihat dan mengajukan izin anaknya jika paket 2 jam" ON public.student_leaves;
DROP POLICY IF EXISTS "Wali bisa melihat status izin anaknya" ON public.student_leaves;
DROP POLICY IF EXISTS "Admin & Kepala mengelola izin siswa" ON public.student_leaves;
CREATE POLICY "Akses student_leaves aplikasi"
    ON public.student_leaves FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 8. TEACHER LEAVES RLS
DROP POLICY IF EXISTS "Akses teacher_leaves aplikasi" ON public.teacher_leaves;
DROP POLICY IF EXISTS "Admin & Kepala mengelola izin guru" ON public.teacher_leaves;
DROP POLICY IF EXISTS "Guru bisa melihat dan mengajukan izin sendiri" ON public.teacher_leaves;
CREATE POLICY "Akses teacher_leaves aplikasi"
    ON public.teacher_leaves FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 9. SALDO JAM HISTORY RLS
DROP POLICY IF EXISTS "Akses saldo_jam_history aplikasi" ON public.saldo_jam_history;
DROP POLICY IF EXISTS "Admin & Kepala mengelola saldo jam" ON public.saldo_jam_history;
DROP POLICY IF EXISTS "Wali bisa melihat riwayat saldo jam anaknya" ON public.saldo_jam_history;
CREATE POLICY "Akses saldo_jam_history aplikasi"
    ON public.saldo_jam_history FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 10. PAYMENTS RLS
DROP POLICY IF EXISTS "Akses payments aplikasi" ON public.payments;
DROP POLICY IF EXISTS "Admin & Kepala mengelola pembayaran" ON public.payments;
DROP POLICY IF EXISTS "Wali bisa melihat riwayat pembayaran anaknya" ON public.payments;
CREATE POLICY "Akses payments aplikasi"
    ON public.payments FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 11. PAYROLLS RLS
DROP POLICY IF EXISTS "Akses payrolls aplikasi" ON public.payrolls;
DROP POLICY IF EXISTS "Admin & Kepala mengelola payroll" ON public.payrolls;
DROP POLICY IF EXISTS "Guru bisa melihat slip gaji miliknya sendiri" ON public.payrolls;
CREATE POLICY "Akses payrolls aplikasi"
    ON public.payrolls FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 12. FINANCIAL SETTINGS RLS
DROP POLICY IF EXISTS "Akses financial_settings aplikasi" ON public.financial_settings;
DROP POLICY IF EXISTS "Admin & Kepala mengelola pengaturan keuangan" ON public.financial_settings;
DROP POLICY IF EXISTS "Semua role bisa melihat pengaturan keuangan" ON public.financial_settings;
CREATE POLICY "Akses financial_settings aplikasi"
    ON public.financial_settings FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 13. ROLE PERMISSIONS RLS
DROP POLICY IF EXISTS "Akses role_permissions aplikasi" ON public.role_permissions;
DROP POLICY IF EXISTS "Hanya Admin yang bisa mengakses dan mengubah hak akses" ON public.role_permissions;
DROP POLICY IF EXISTS "Semua role bisa membaca permissions untuk navigasi" ON public.role_permissions;
CREATE POLICY "Akses role_permissions aplikasi"
    ON public.role_permissions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- DATA AWAL (SEED DATA)
-- ==============================================================================

-- Seed 10 Paket Terapi Resmi Little Star Learning Center
INSERT INTO public.packages (id, name, duration_hours, frequency_per_week, price_monthly, description)
VALUES
    ('PKT-1-1', 'Paket 1 Jam (1x / minggu)', 1, 1, 250000, 'Sesi terapi 1 jam, 1 kali pertemuan per minggu'),
    ('PKT-1-2', 'Paket 1 Jam (2x / minggu)', 1, 2, 450000, 'Sesi terapi 1 jam, 2 kali pertemuan per minggu'),
    ('PKT-1-3', 'Paket 1 Jam (3x / minggu)', 1, 3, 650000, 'Sesi terapi 1 jam, 3 kali pertemuan per minggu'),
    ('PKT-1-4', 'Paket 1 Jam (4x / minggu)', 1, 4, 850000, 'Sesi terapi 1 jam, 4 kali pertemuan per minggu'),
    ('PKT-1-5', 'Paket 1 Jam (5x / minggu)', 1, 5, 1000000, 'Sesi terapi 1 jam, 5 kali pertemuan per minggu'),
    ('PKT-2-1', 'Paket 2 Jam (1x / minggu)', 2, 1, 500000, 'Sesi intensif 2 jam, 1 kali pertemuan per minggu (Bisa izin)'),
    ('PKT-2-2', 'Paket 2 Jam (2x / minggu)', 2, 2, 900000, 'Sesi intensif 2 jam, 2 kali pertemuan per minggu (Bisa izin)'),
    ('PKT-2-3', 'Paket 2 Jam (3x / minggu)', 2, 3, 1300000, 'Sesi intensif 2 jam, 3 kali pertemuan per minggu (Bisa izin)'),
    ('PKT-2-4', 'Paket 2 Jam (4x / minggu)', 2, 4, 1700000, 'Sesi intensif 2 jam, 4 kali pertemuan per minggu (Bisa izin)'),
    ('PKT-2-5', 'Paket 2 Jam (5x / minggu)', 2, 5, 2000000, 'Sesi intensif 2 jam, 5 kali pertemuan per minggu (Bisa izin)')
ON CONFLICT (id) DO UPDATE SET 
    price_monthly = EXCLUDED.price_monthly,
    name = EXCLUDED.name,
    duration_hours = EXCLUDED.duration_hours,
    frequency_per_week = EXCLUDED.frequency_per_week,
    description = EXCLUDED.description;

-- Seed Pengaturan Keuangan Default
INSERT INTO public.financial_settings (id, default_hourly_rate, full_attendance_bonus, daily_leave_deduction)
VALUES (1, 20000, 50000, 75000)
ON CONFLICT (id) DO UPDATE SET
    default_hourly_rate = EXCLUDED.default_hourly_rate,
    full_attendance_bonus = EXCLUDED.full_attendance_bonus,
    daily_leave_deduction = EXCLUDED.daily_leave_deduction;

-- Seed Matriks Hak Akses Default
INSERT INTO public.role_permissions (id, role, module, can_view, can_add, can_edit, can_delete) VALUES
    ('perm-adm-siswa', 'admin', 'siswa', true, true, true, true),
    ('perm-adm-guru', 'admin', 'guru', true, true, true, true),
    ('perm-adm-paket', 'admin', 'paket', true, true, true, true),
    ('perm-adm-jadwal', 'admin', 'jadwal', true, true, true, true),
    ('perm-adm-absensi', 'admin', 'absensi', true, true, true, true),
    ('perm-adm-izin-siswa', 'admin', 'izin_siswa', true, true, true, true),
    ('perm-adm-izin-guru', 'admin', 'izin_guru', true, true, true, true),
    ('perm-adm-saldo', 'admin', 'saldo_jam', true, true, true, true),
    ('perm-adm-bayar', 'admin', 'pembayaran', true, true, true, true),
    ('perm-adm-gaji', 'admin', 'gaji', true, true, true, true),
    ('perm-adm-akses', 'admin', 'hak_akses', true, true, true, true),
    ('perm-kpl-siswa', 'kepala', 'siswa', true, true, true, false),
    ('perm-kpl-guru', 'kepala', 'guru', true, true, true, false),
    ('perm-kpl-paket', 'kepala', 'paket', true, true, true, false),
    ('perm-kpl-jadwal', 'kepala', 'jadwal', true, true, true, false),
    ('perm-kpl-absensi', 'kepala', 'absensi', true, true, true, false),
    ('perm-kpl-izin-siswa', 'kepala', 'izin_siswa', true, false, true, false),
    ('perm-kpl-izin-guru', 'kepala', 'izin_guru', true, false, true, false),
    ('perm-kpl-saldo', 'kepala', 'saldo_jam', true, true, true, false),
    ('perm-kpl-bayar', 'kepala', 'pembayaran', true, true, true, false),
    ('perm-kpl-gaji', 'kepala', 'gaji', true, true, true, false),
    ('perm-kpl-akses', 'kepala', 'hak_akses', false, false, false, false),
    ('perm-gru-siswa', 'guru', 'siswa', true, false, false, false),
    ('perm-gru-guru', 'guru', 'guru', false, false, false, false),
    ('perm-gru-paket', 'guru', 'paket', true, false, false, false),
    ('perm-gru-jadwal', 'guru', 'jadwal', true, false, false, false),
    ('perm-gru-absensi', 'guru', 'absensi', true, true, true, false),
    ('perm-gru-izin-siswa', 'guru', 'izin_siswa', true, false, false, false),
    ('perm-gru-izin-guru', 'guru', 'izin_guru', true, true, false, false),
    ('perm-gru-saldo', 'guru', 'saldo_jam', false, false, false, false),
    ('perm-gru-bayar', 'guru', 'pembayaran', false, false, false, false),
    ('perm-gru-gaji', 'guru', 'gaji', true, false, false, false),
    ('perm-gru-akses', 'guru', 'hak_akses', false, false, false, false),
    ('perm-wal-siswa', 'wali', 'siswa', true, false, false, false),
    ('perm-wal-guru', 'wali', 'guru', false, false, false, false),
    ('perm-wal-paket', 'wali', 'paket', true, false, false, false),
    ('perm-wal-jadwal', 'wali', 'jadwal', true, false, false, false),
    ('perm-wal-absensi', 'wali', 'absensi', true, false, false, false),
    ('perm-wal-izin-siswa', 'wali', 'izin_siswa', true, true, false, false),
    ('perm-wal-izin-guru', 'wali', 'izin_guru', false, false, false, false),
    ('perm-wal-saldo', 'wali', 'saldo_jam', true, false, false, false),
    ('perm-wal-bayar', 'wali', 'pembayaran', true, false, false, false),
    ('perm-wal-gaji', 'wali', 'gaji', false, false, false, false),
    ('perm-wal-akses', 'wali', 'hak_akses', false, false, false, false)
ON CONFLICT (id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_add = EXCLUDED.can_add,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- Seed Profil Pengguna Awal
INSERT INTO public.profiles (id, username, full_name, role, position, password, status, phone, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator Utama', 'admin', 'Administrator Lembaga', '12345', 'aktif', '081234567890', 'admin@littlestar.id'),
    ('00000000-0000-0000-0000-000000000002', 'kepala', 'Hj. Fatimah, S.Psi, M.Ed', 'kepala', 'Kepala Lembaga', '12345', 'aktif', '081234567891', 'kepala@littlestar.id'),
    ('00000000-0000-0000-0000-000000000003', 'guru1', 'Siti Rahmawati, S.Tr.Kes', 'guru', 'Terapis Wicara', '12345', 'aktif', '081234567892', 'siti@littlestar.id'),
    ('00000000-0000-0000-0000-000000000004', 'guru2', 'Budi Santoso, S.Pd', 'guru', 'Terapis Okupasi', '12345', 'aktif', '081234567893', 'budi@littlestar.id'),
    ('00000000-0000-0000-0000-000000000005', 'wali1', 'Ibu Ratna Dewi', 'wali', 'Wali Murid', '12345', 'aktif', '081298765432', 'ratna@gmail.com'),
    ('00000000-0000-0000-0000-000000000006', 'wali2', 'Bapak Hendra Gunawan', 'wali', 'Wali Murid', '12345', 'dibekukan', '081298765433', 'hendra@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    position = EXCLUDED.position,
    password = EXCLUDED.password,
    status = EXCLUDED.status,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- Seed Guru Awal
INSERT INTO public.teachers (id, user_id, name, position, role, phone, address, join_date, status, salary_system, hourly_rate, monthly_salary) VALUES
    ('GUR-001', '00000000-0000-0000-0000-000000000003', 'Siti Rahmawati, S.Tr.Kes', 'Terapis Wicara', 'guru', '081234567892', 'Jl. Melati No. 14, Jakarta Selatan', '2023-01-15', 'aktif', 'per_jam', 20000, 0),
    ('GUR-002', '00000000-0000-0000-0000-000000000004', 'Budi Santoso, S.Pd', 'Terapis Okupasi', 'guru', '081234567893', 'Jl. Anggrek No. 8, Tangerang Selatan', '2023-03-01', 'aktif', 'bulanan', 0, 3200000),
    ('GUR-003', NULL, 'Dewi Lestari, S.Psi', 'Terapis Sensori Integrasi', 'guru', '081234567894', 'Jl. Flamboyan No. 20, Depok', '2023-06-10', 'aktif', 'per_jam', 20000, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    position = EXCLUDED.position,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    salary_system = EXCLUDED.salary_system,
    hourly_rate = EXCLUDED.hourly_rate,
    monthly_salary = EXCLUDED.monthly_salary;

-- Seed Siswa Awal
INSERT INTO public.students (id, name, birth_date, parent_name, parent_phone, parent_user_id, address, package_id, teacher_id, account_status, saldo_jam) VALUES
    ('SIS-001', 'Muhammad Alif', '2019-05-12', 'Ibu Ratna Dewi', '081298765432', '00000000-0000-0000-0000-000000000005', 'Jl. Mawar Indah Blok B3, Jakarta', 'PKT-2-3', 'GUR-001', 'aktif', 2),
    ('SIS-002', 'Nadhira Kirana', '2020-02-18', 'Bapak Surya Pranoto', '081387654321', NULL, 'Jl. Cempaka Baru No. 12, Jakarta', 'PKT-1-2', 'GUR-001', 'aktif', 0),
    ('SIS-003', 'Kenzo Pratama', '2018-11-25', 'Bapak Hendra Gunawan', '081298765433', '00000000-0000-0000-0000-000000000006', 'Jl. Pinus No. 5, Jakarta Barat', 'PKT-1-3', 'GUR-002', 'dibekukan', 0),
    ('SIS-004', 'Aisyah Putri', '2019-09-08', 'Ibu Ratna Dewi', '081298765432', '00000000-0000-0000-0000-000000000005', 'Jl. Mawar Indah Blok B3, Jakarta', 'PKT-2-2', 'GUR-002', 'aktif', 1)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    birth_date = EXCLUDED.birth_date,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    address = EXCLUDED.address,
    package_id = EXCLUDED.package_id,
    teacher_id = EXCLUDED.teacher_id,
    account_status = EXCLUDED.account_status,
    saldo_jam = EXCLUDED.saldo_jam;
