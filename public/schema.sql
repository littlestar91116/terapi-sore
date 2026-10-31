-- ==============================================================================
-- SISTEM ABSENSI & KEUANGAN TERAPI SISWA
-- SQL Schema, Relasi, RLS Policies, dan Data Awal (Seed) untuk Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPE ENUM
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
    status account_status NOT NULL DEFAULT 'aktif',
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    start_time TEXT NOT NULL, -- e.g. "13:00"
    end_time TEXT NOT NULL,   -- e.g. "14:00" atau "15:00"
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
    month_year TEXT NOT NULL, -- YYYY-MM
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
-- ==============================================================================

-- Aktifkan RLS di semua tabel
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

-- Helper function untuk mendapatkan role user aktif
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. PROFILES RLS
CREATE POLICY "Admin & Kepala punya akses penuh ke profiles"
    ON public.profiles FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

CREATE POLICY "User bisa melihat profil sendiri"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

-- 2. PACKAGES RLS
CREATE POLICY "Semua role bisa melihat paket aktif"
    ON public.packages FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin & Kepala bisa mengelola paket"
    ON public.packages FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

-- 3. TEACHERS RLS
CREATE POLICY "Semua user terotentikasi bisa melihat data guru"
    ON public.teachers FOR SELECT
    USING (TRUE);

CREATE POLICY "Admin & Kepala mengelola guru"
    ON public.teachers FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

-- 4. STUDENTS RLS
CREATE POLICY "Admin, Kepala, dan Guru bisa melihat seluruh siswa"
    ON public.students FOR SELECT
    USING (public.get_current_role() IN ('admin', 'kepala', 'guru'));

CREATE POLICY "Wali murid hanya melihat siswa miliknya"
    ON public.students FOR SELECT
    USING (parent_user_id = auth.uid());

CREATE POLICY "Admin & Kepala mengelola siswa"
    ON public.students FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

-- 5. THERAPY SESSIONS RLS
CREATE POLICY "Admin, Kepala, dan Guru melihat semua sesi terapi"
    ON public.therapy_sessions FOR SELECT
    USING (public.get_current_role() IN ('admin', 'kepala', 'guru'));

CREATE POLICY "Guru bisa memperbarui absensi sesi terapi"
    ON public.therapy_sessions FOR UPDATE
    USING (public.get_current_role() IN ('admin', 'kepala', 'guru'));

CREATE POLICY "Wali hanya melihat sesi anaknya jika akun tidak dibekukan"
    ON public.therapy_sessions FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students 
            WHERE parent_user_id = auth.uid() AND account_status != 'dibekukan'
        )
    );

-- 6. STUDENT LEAVES RLS (Khusus paket 2 jam)
CREATE POLICY "Wali bisa melihat dan mengajukan izin anaknya jika paket 2 jam"
    ON public.student_leaves FOR INSERT
    WITH CHECK (
        student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.packages p ON s.package_id = p.id
            WHERE s.parent_user_id = auth.uid() 
              AND p.duration_hours = 2 
              AND s.account_status != 'dibekukan'
        )
    );

CREATE POLICY "Admin & Kepala mengelola izin siswa"
    ON public.student_leaves FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

-- 7. PAYMENTS & RECEIPT RLS
CREATE POLICY "Admin & Kepala mengelola pembayaran"
    ON public.payments FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

CREATE POLICY "Wali bisa melihat riwayat pembayaran anaknya"
    ON public.payments FOR SELECT
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE parent_user_id = auth.uid()
        )
    );

-- 8. PAYROLLS RLS
CREATE POLICY "Admin & Kepala mengelola payroll"
    ON public.payrolls FOR ALL
    USING (public.get_current_role() IN ('admin', 'kepala'));

CREATE POLICY "Guru bisa melihat slip gaji miliknya sendiri"
    ON public.payrolls FOR SELECT
    USING (
        teacher_id IN (
            SELECT id FROM public.teachers WHERE user_id = auth.uid()
        )
    );

-- 9. ROLE PERMISSIONS RLS (Khusus Admin)
CREATE POLICY "Hanya Admin yang bisa mengakses dan mengubah hak akses"
    ON public.role_permissions FOR ALL
    USING (public.get_current_role() = 'admin');

CREATE POLICY "Semua role bisa membaca permissions untuk navigasi"
    ON public.role_permissions FOR SELECT
    USING (TRUE);

-- ==============================================================================
-- DATA AWAL (SEED DATA)
-- ==============================================================================

-- Seed 10 Paket Terapi Resmi
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
    name = EXCLUDED.name;

-- Seed Pengaturan Keuangan Default
INSERT INTO public.financial_settings (id, default_hourly_rate, full_attendance_bonus, daily_leave_deduction)
VALUES (1, 20000, 50000, 75000)
ON CONFLICT (id) DO NOTHING;

-- Seed Matriks Hak Akses Default
INSERT INTO public.role_permissions (id, role, module, can_view, can_add, can_edit, can_delete) VALUES
    -- Admin: Akses penuh ke semua modul
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
    
    -- Kepala: Akses luas tanpa pengaturan hak akses
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

    -- Guru: Jadwal mengajar, absensi, izin sendiri, slip gaji
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

    -- Wali: Jadwal anak, izin (jika paket 2 jam), status bayar & saldo
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
INSERT INTO public.profiles (id, username, full_name, role, status, phone, email) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator Utama', 'admin', 'aktif', '081234567890', 'admin@terapi.id'),
    ('00000000-0000-0000-0000-000000000002', 'kepala', 'Hj. Fatimah, S.Psi, M.Ed', 'kepala', 'aktif', '081234567891', 'kepala@terapi.id'),
    ('00000000-0000-0000-0000-000000000003', 'guru1', 'Siti Rahmawati, S.Tr.Kes', 'guru', 'aktif', '081234567892', 'siti@terapi.id'),
    ('00000000-0000-0000-0000-000000000004', 'guru2', 'Budi Santoso, S.Pd', 'guru', 'aktif', '081234567893', 'budi@terapi.id'),
    ('00000000-0000-0000-0000-000000000005', 'wali1', 'Ibu Ratna Dewi', 'wali', 'aktif', '081298765432', 'ratna@gmail.com'),
    ('00000000-0000-0000-0000-000000000006', 'wali2', 'Bapak Hendra Gunawan', 'wali', 'dibekukan', '081298765433', 'hendra@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Guru Awal
INSERT INTO public.teachers (id, user_id, name, phone, address, join_date, status, salary_system, hourly_rate, monthly_salary) VALUES
    ('GUR-001', '00000000-0000-0000-0000-000000000003', 'Siti Rahmawati, S.Tr.Kes', '081234567892', 'Jl. Melati No. 14, Jakarta Selatan', '2023-01-15', 'aktif', 'per_jam', 20000, 0),
    ('GUR-002', '00000000-0000-0000-0000-000000000004', 'Budi Santoso, S.Pd', '081234567893', 'Jl. Anggrek No. 8, Tangerang Selatan', '2023-03-01', 'aktif', 'bulanan', 0, 3200000),
    ('GUR-003', NULL, 'Dewi Lestari, S.Psi', '081234567894', 'Jl. Flamboyan No. 20, Depok', '2023-06-10', 'aktif', 'per_jam', 20000, 0)
ON CONFLICT (id) DO NOTHING;

-- Seed Siswa Awal
INSERT INTO public.students (id, name, birth_date, parent_name, parent_phone, parent_user_id, address, package_id, teacher_id, account_status, saldo_jam) VALUES
    ('SIS-001', 'Muhammad Alif', '2019-05-12', 'Ibu Ratna Dewi', '081298765432', '00000000-0000-0000-0000-000000000005', 'Jl. Mawar Indah Blok B3, Jakarta', 'PKT-2-3', 'GUR-001', 'aktif', 2),
    ('SIS-002', 'Nadhira Kirana', '2020-02-18', 'Bapak Surya Pranoto', '081387654321', NULL, 'Jl. Cempaka Baru No. 12, Jakarta', 'PKT-1-2', 'GUR-001', 'aktif', 0),
    ('SIS-003', 'Kenzo Pratama', '2018-11-25', 'Bapak Hendra Gunawan', '081298765433', '00000000-0000-0000-0000-000000000006', 'Jl. Pinus No. 5, Jakarta Barat', 'PKT-1-3', 'GUR-002', 'dibekukan', 0),
    ('SIS-004', 'Aisyah Putri', '2019-09-08', 'Ibu Ratna Dewi', '081298765432', '00000000-0000-0000-0000-000000000005', 'Jl. Mawar Indah Blok B3, Jakarta', 'PKT-2-2', 'GUR-002', 'aktif', 1)
ON CONFLICT (id) DO NOTHING;
