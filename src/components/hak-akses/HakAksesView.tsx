import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Check,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole, AppModule, RolePermission, AccountStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SEED_USERS } from '../../data/seedData';

export const HakAksesView: React.FC = () => {
  const {
    currentRole,
    permissions,
    updatePermissions,
    users,
    addUserAccount,
    updateUserAccount,
    deleteUserAccount,
  } = useAuth();

  // Guard: Hanya admin yang boleh membuka modul ini
  if (currentRole !== 'admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center text-rose-800 space-y-3">
        <Lock className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-lg font-bold">Akses Ditolak (403 Forbidden)</h3>
        <p className="text-xs max-w-md mx-auto">
          Halaman Pengaturan Hak Akses dilindungi oleh aturan keamanan tingkat tinggi (Row Level
          Security) dan hanya dapat diakses oleh akun dengan peran <strong>Administrator</strong>.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'matriks' | 'users'>('matriks');
  const [selectedRole, setSelectedRole] = useState<UserRole>('kepala');

  // Search & Filter for User Accounts
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'semua' | UserRole>('semua');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [userForm, setUserForm] = useState<{
    username: string;
    fullName: string;
    role: UserRole;
    position: string;
    phone: string;
    status: AccountStatus;
    password?: string;
    email?: string;
  }>({
    username: '',
    fullName: '',
    role: 'guru',
    position: 'Guru Terapis',
    phone: '',
    status: 'aktif',
    password: '123',
    email: '',
  });

  const moduleNames: { id: AppModule; label: string }[] = [
    { id: 'siswa', label: '1. Data Siswa' },
    { id: 'guru', label: '2. Data Guru & Tarif' },
    { id: 'paket', label: '3. Paket Terapi' },
    { id: 'jadwal', label: '4. Jadwal Terapi Bulanan' },
    { id: 'absensi', label: '5. Absensi Siswa' },
    { id: 'izin_siswa', label: '6. Izin Siswa (Paket 2 Jam)' },
    { id: 'izin_guru', label: '7. Izin Guru' },
    { id: 'saldo_jam', label: '8. Saldo Jam Terapi' },
    { id: 'pembayaran', label: '9. Pembayaran & Kwitansi' },
    { id: 'gaji', label: '10. Gaji Guru Bulanan' },
    { id: 'hak_akses', label: '11. Pengaturan Hak Akses (Admin)' },
  ];

  // Matriks toggle
  const handleTogglePermission = (
    role: UserRole,
    module: AppModule,
    action: 'canView' | 'canAdd' | 'canEdit' | 'canDelete'
  ) => {
    // Admin selalu punya akses penuh
    if (role === 'admin') return;

    // Modul hak akses tidak boleh diberikan ke role selain admin
    if (module === 'hak_akses') return;

    const updated = permissions.map((p) => {
      if (p.role === role && p.module === module) {
        return {
          ...p,
          [action]: !p[action],
        };
      }
      return p;
    });

    updatePermissions(updated);
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      fullName: '',
      role: 'guru',
      position: 'Guru Terapis',
      phone: '',
      status: 'aktif',
      password: '123',
      email: '',
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUserForm({
      username: user.username || (user.email ? user.email.split('@')[0] : ''),
      fullName: user.fullName,
      role: user.role,
      position: user.position || (user.role === 'wali' ? 'Wali Murid' : 'Guru Terapis'),
      phone: user.phone || '',
      status: user.status,
      password: user.password || '123',
      email: user.email || '',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.fullName.trim()) return;

    const cleanUsername = userForm.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (editingUser) {
      updateUserAccount({
        id: editingUser.id,
        ...userForm,
        username: cleanUsername,
      });
    } else {
      const newUser: UserProfile & { password?: string } = {
        id: `usr-${Date.now().toString(36)}`,
        ...userForm,
        username: cleanUsername,
      };
      addUserAccount(newUser);
    }
    setIsUserModalOpen(false);
  };

  const rolePermissionsForSelected = permissions.filter((p) => p.role === selectedRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pengaturan Hak Akses & Akun
            </h2>
            <Badge variant="purple">Khusus Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manajemen matriks hak akses modul (Lihat, Tambah, Edit, Hapus) dan akun pengguna.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('matriks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'matriks'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Matriks Hak Akses Peran
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Manajemen Akun Pengguna
          </button>
        </div>
      </div>

      {/* TAB 1: MATRIKS HAK AKSES */}
      {activeTab === 'matriks' && (
        <div className="space-y-4">
          {/* Selector Peran */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Pilih Peran untuk Dikonfigurasi:</span>
              <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
                {(['kepala', 'guru', 'wali'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                      selectedRole === r
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r === 'wali' ? 'Wali Murid' : r}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-2xs text-slate-500">
              *Peran <strong>Admin</strong> memiliki hak akses penuh ke seluruh modul secara permanen.
            </div>
          </div>

          {/* Grid Matriks Centang */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Nama Modul Sistem</th>
                    <th className="px-4 py-3.5 text-center">Lihat (View)</th>
                    <th className="px-4 py-3.5 text-center">Tambah (Add)</th>
                    <th className="px-4 py-3.5 text-center">Edit (Edit)</th>
                    <th className="px-4 py-3.5 text-center">Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {moduleNames.map((mod) => {
                    const perm = rolePermissionsForSelected.find((p) => p.module === mod.id);
                    const isRestrictedModule = mod.id === 'hak_akses';

                    return (
                      <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          {mod.label}
                          {isRestrictedModule && (
                            <span className="block text-3xs font-semibold text-rose-600 mt-0.5">
                              Terkunci khusus Admin (RLS Enforced)
                            </span>
                          )}
                        </td>

                        {/* Lihat */}
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isRestrictedModule}
                            checked={perm?.canView || false}
                            onChange={() =>
                              handleTogglePermission(selectedRole, mod.id, 'canView')
                            }
                            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Tambah */}
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isRestrictedModule}
                            checked={perm?.canAdd || false}
                            onChange={() => handleTogglePermission(selectedRole, mod.id, 'canAdd')}
                            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Edit */}
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isRestrictedModule}
                            checked={perm?.canEdit || false}
                            onChange={() =>
                              handleTogglePermission(selectedRole, mod.id, 'canEdit')
                            }
                            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Hapus */}
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            disabled={isRestrictedModule}
                            checked={perm?.canDelete || false}
                            onChange={() =>
                              handleTogglePermission(selectedRole, mod.id, 'canDelete')
                            }
                            className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN AKUN PENGGUNA */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Akun Pengguna Terdaftar</h3>
              <p className="text-2xs text-slate-500">
                Semua akun dibuat dan disinkronkan otomatis dari Data Siswa, Guru/Staf, atau dibuat manual.
              </p>
            </div>
            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Buat Akun Manual
            </button>
          </div>

          {/* Search & Role Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Cari berdasarkan username, nama lengkap, atau jabatan..."
                className="w-full pl-3 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold text-slate-500">Filter Peran:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer font-semibold text-slate-700"
              >
                <option value="semua">Semua Peran ({users.length})</option>
                <option value="admin">Admin</option>
                <option value="kepala">Kepala</option>
                <option value="guru">Guru</option>
                <option value="wali">Wali Murid</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-2xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Username & ID</th>
                    <th className="px-4 py-3.5">Nama & Jabatan</th>
                    <th className="px-4 py-3.5">Peran (Role)</th>
                    <th className="px-4 py-3.5">Password</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {users
                    .filter((u) => {
                      const matchRole = roleFilter === 'semua' || u.role === roleFilter;
                      const q = userSearch.toLowerCase();
                      const matchSearch =
                        (u.username && u.username.toLowerCase().includes(q)) ||
                        u.fullName.toLowerCase().includes(q) ||
                        (u.position && u.position.toLowerCase().includes(q)) ||
                        (u.phone && u.phone.includes(q)) ||
                        (u.email && u.email.toLowerCase().includes(q));
                      return matchRole && matchSearch;
                    })
                    .map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            @{user.username}
                          </div>
                          <span className="text-3xs text-slate-400 font-mono">{user.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{user.fullName}</div>
                          <span className="inline-block text-3xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 mt-0.5">
                            {user.position || (user.role === 'wali' ? 'Wali Murid' : 'Guru Terapis')}
                          </span>
                        </td>
                        <td className="px-4 py-4 capitalize">
                          <Badge
                            variant={
                              user.role === 'admin'
                                ? 'purple'
                                : user.role === 'kepala'
                                ? 'blue'
                                : user.role === 'guru'
                                ? 'green'
                                : 'yellow'
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 font-mono text-2xs text-slate-600">
                          {user.password ? (
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-bold">
                              {user.password}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Tersimpan aman</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge
                            variant={
                              user.status === 'aktif'
                                ? 'green'
                                : user.status === 'dibekukan'
                                ? 'red'
                                : 'gray'
                            }
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(user)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Ubah Akun"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Ubah
                            </button>
                            {user.username !== 'admin' && user.role !== 'admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus akun @${user.username}?`)) {
                                    deleteUserAccount(user.id);
                                  }
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit User */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Ubah Akun Pengguna' : 'Buat Akun Pengguna Baru'}
        subtitle="Kelola username, kata sandi, jabatan, peran, dan status akun"
        maxWidth="md"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="Contoh: guru_ahmad"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Kata Sandi (Password) *
              </label>
              <input
                type="text"
                required
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Password..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              required
              value={userForm.fullName}
              onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
              placeholder="Contoh: Ahmad Fauzi, S.Psi"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Jabatan / Posisi *
            </label>
            <input
              type="text"
              required
              value={userForm.position}
              onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
              placeholder="Contoh: Terapis Wicara / Kepala Lembaga / Wali Murid"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Peran (Role) *
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 text-xs bg-purple-50 border border-purple-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden cursor-pointer font-bold text-purple-900"
              >
                <option value="guru">Guru</option>
                <option value="kepala">Kepala</option>
                <option value="wali">Wali Murid</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Status Akun *
              </label>
              <select
                value={userForm.status}
                onChange={(e) =>
                  setUserForm({ ...userForm, status: e.target.value as any })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="aktif">Aktif</option>
                <option value="dibekukan">Dibekukan</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUserModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Simpan Akun
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
