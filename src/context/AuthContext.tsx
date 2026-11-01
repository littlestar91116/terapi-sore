import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AppModule, RolePermission, Student, Teacher } from '../types';
import { SEED_USERS, SEED_ROLE_PERMISSIONS } from '../data/seedData';
import { getSupabase } from '../lib/supabase';
import {
  ensureUuid,
  syncProfileToSupabase,
  deleteProfileFromSupabase,
  fetchProfilesFromSupabase,
} from '../lib/supabaseSync';

interface AuthContextType {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  isFrozen: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: UserRole, accountStatus?: 'aktif' | 'dibekukan') => void;
  hasPermission: (module: AppModule, action: 'view' | 'add' | 'edit' | 'delete') => boolean;
  permissions: RolePermission[];
  updatePermissions: (newPermissions: RolePermission[]) => void;
  // Dynamic user accounts
  users: (UserProfile & { password?: string })[];
  addUserAccount: (user: UserProfile & { password?: string }) => void;
  updateUserAccount: (user: Partial<UserProfile> & { id: string; password?: string }) => void;
  deleteUserAccount: (userId: string) => void;
  // Auto-sync for Student and Teacher
  syncStudentParentAccount: (
    student: Student,
    customCreds?: { username?: string; password?: string }
  ) => UserProfile;
  syncTeacherAccount: (
    teacher: Teacher,
    customCreds?: { username?: string; password?: string; role?: UserRole; position?: string }
  ) => UserProfile;
  syncFreezeStudent: (studentId: string, freeze: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'terapi_current_user';
const LOCAL_STORAGE_USERS_LIST_KEY = 'terapi_all_users_v3';
const LOCAL_STORAGE_PERMS_KEY = 'terapi_role_permissions';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Daftar seluruh akun pengguna sistem
  const [users, setUsers] = useState<(UserProfile & { password?: string })[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USERS_LIST_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback ke seed
      }
    }
    return SEED_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PERMS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SEED_ROLE_PERMISSIONS;
      }
    }
    return SEED_ROLE_PERMISSIONS;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_USERS_LIST_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_PERMS_KEY, JSON.stringify(permissions));
  }, [permissions]);

  // Muat akun dari Supabase saat aplikasi dibuka jika Supabase terhubung
  useEffect(() => {
    fetchProfilesFromSupabase().then((remoteProfiles) => {
      if (remoteProfiles && remoteProfiles.length > 0) {
        setUsers((prev) => {
          const merged = [...prev];
          for (const remote of remoteProfiles) {
            const idx = merged.findIndex(
              (m) =>
                (m.email && remote.email && m.email.toLowerCase() === remote.email.toLowerCase()) ||
                (m.id && remote.id && m.id === remote.id)
            );
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...remote };
            } else {
              merged.push(remote);
            }
          }
          return merged;
        });
      }
    });
  }, []);

  const currentRole: UserRole = currentUser?.role || 'wali';
  const isFrozen: boolean = currentUser?.status === 'dibekukan';

  // Login menggunakan USERNAME (atau email jika terisi)
  const login = async (usernameInput: string, password = ''): Promise<{ success: boolean; message?: string }> => {
    const supabase = getSupabase();
    const cleanUsername = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_@.]/g, '');

    // 1. Cek database Supabase: tabel user_accounts terlebih dahulu, lalu profiles
    if (supabase) {
      try {
        // Cek tabel user_accounts
        const { data: accData, error: accError } = await supabase
          .from('user_accounts')
          .select('*')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (!accError && accData) {
          if (accData.password && password && accData.password !== password) {
            return {
              success: false,
              message: 'Password salah. Silakan periksa kembali kata sandi Anda.',
            };
          }
          if (accData.status === 'nonaktif') {
            return {
              success: false,
              message: 'Akun Anda sedang dinonaktifkan oleh administrator.',
            };
          }

          const userObj: UserProfile = {
            id: accData.id || accData.user_id,
            username: accData.username,
            fullName: accData.full_name,
            role: accData.role as UserRole,
            status: accData.status as 'aktif' | 'dibekukan' | 'nonaktif',
            phone: accData.phone,
            position: accData.position,
          };
          setCurrentUser(userObj);
          return { success: true };
        }

        // Cek tabel profiles jika belum ketemu
        const { data: profData, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.${cleanUsername},email.ilike.${cleanUsername}`)
          .maybeSingle();

        if (!profError && profData) {
          if (profData.password && password && profData.password !== password) {
            return {
              success: false,
              message: 'Password salah. Silakan periksa kembali kata sandi Anda.',
            };
          }
          if (profData.status === 'nonaktif') {
            return {
              success: false,
              message: 'Akun Anda sedang dinonaktifkan oleh administrator.',
            };
          }

          const userObj: UserProfile = {
            id: profData.id,
            username: profData.username || cleanUsername,
            email: profData.email,
            fullName: profData.full_name,
            role: profData.role as UserRole,
            status: profData.status as 'aktif' | 'dibekukan' | 'nonaktif',
            phone: profData.phone,
            position: profData.position,
          };
          setCurrentUser(userObj);
          return { success: true };
        }
      } catch (e) {
        console.warn('Gagal cek auth supabase, beralih ke data lokal:', e);
      }
    }

    // 2. Cek dari daftar akun dinamis lokal (users)
    const matched = users.find(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUsername) ||
        (u.email && u.email.toLowerCase() === cleanUsername)
    );

    if (matched) {
      if (matched.password && password && matched.password !== password) {
        return {
          success: false,
          message: 'Password salah. Silakan periksa kembali kata sandi Anda.',
        };
      }
      if (matched.status === 'nonaktif') {
        return {
          success: false,
          message: 'Akun Anda sedang dinonaktifkan oleh administrator.',
        };
      }
      const { password: _, ...safeUser } = matched;
      setCurrentUser(safeUser);
      return { success: true };
    }

    return {
      success: false,
      message: 'Username tidak ditemukan. Pastikan username yang Anda masukkan sudah terdaftar di sistem Little Star Learning Center.',
    };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole, accountStatus: 'aktif' | 'dibekukan' = 'aktif') => {
    const userForRole =
      users.find(
        (u) =>
          u.role === role &&
          (accountStatus === 'dibekukan' ? u.status === 'dibekukan' : u.status === 'aktif')
      ) ||
      users.find((u) => u.role === role) ||
      users[0];

    const { password: _, ...safeUser } = userForRole;
    setCurrentUser({
      ...safeUser,
      status: accountStatus,
    });
  };

  const hasPermission = (module: AppModule, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    if (currentRole === 'admin') return true;

    if (isFrozen && currentRole === 'wali') {
      return false;
    }

    if (module === 'hak_akses') {
      return false;
    }

    const perm = permissions.find((p) => p.role === currentRole && p.module === module);
    if (!perm) return false;

    switch (action) {
      case 'view':
        return perm.canView;
      case 'add':
        return perm.canAdd;
      case 'edit':
        return perm.canEdit;
      case 'delete':
        return perm.canDelete;
      default:
        return false;
    }
  };

  const updatePermissions = (newPermissions: RolePermission[]) => {
    setPermissions(newPermissions);
  };

  // Direct Account Management (Berbasis Username)
  const addUserAccount = (user: UserProfile & { password?: string }) => {
    const cleanUsername = (user.username || user.email?.split('@')[0] || 'user')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    const validUser = {
      ...user,
      id: ensureUuid(user.id),
      username: cleanUsername,
    };
    setUsers((prev) => [...prev, validUser]);
    // Kirim langsung otomatis ke Supabase (user_accounts & profiles)
    syncProfileToSupabase(validUser);
  };

  const updateUserAccount = (user: Partial<UserProfile> & { id: string; password?: string }) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === user.id) {
          const cleanUsername = (user.username || u.username)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

          const updated = {
            ...u,
            ...user,
            username: cleanUsername,
          };
          if (currentUser?.id === user.id) {
            const { password: _, ...safe } = updated;
            setCurrentUser(safe);
          }
          // Kirim langsung otomatis ke Supabase
          syncProfileToSupabase(updated);
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUserAccount = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    if (target) {
      deleteProfileFromSupabase(target.username || target.id);
    }
  };

  // Otomatis pembuatan & sinkronisasi akun Wali Murid berbasis USERNAME
  const syncStudentParentAccount = (
    student: Student,
    customCreds?: { username?: string; password?: string }
  ): UserProfile => {
    let resultUser: UserProfile = { ...student } as any;

    setUsers((prevUsers) => {
      // Cari apakah sudah ada akun wali terkait berdasarkan ID, nomor HP, atau nama
      const existingIndex = prevUsers.findIndex(
        (u) =>
          (student.parentUserId && u.id === student.parentUserId) ||
          (customCreds?.username && u.username && u.username.toLowerCase() === customCreds.username.toLowerCase().trim()) ||
          (u.phone && student.parentPhone && u.phone === student.parentPhone) ||
          (u.role === 'wali' && u.fullName.toLowerCase() === student.parentName.toLowerCase())
      );

      if (existingIndex >= 0) {
        const existing = prevUsers[existingIndex];
        const updatedStudentIds = Array.from(
          new Set([...(existing.studentIds || []), student.id])
        );

        let targetUsername = existing.username;
        if (customCreds?.username && customCreds.username.trim()) {
          targetUsername = customCreds.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        }

        const updatedUser: UserProfile & { password?: string } = {
          ...existing,
          username: targetUsername,
          fullName: student.parentName,
          phone: student.parentPhone || existing.phone,
          status: student.accountStatus,
          position: 'Wali Murid',
          studentIds: updatedStudentIds,
          password: customCreds?.password || existing.password || '123',
        };

        const next = [...prevUsers];
        next[existingIndex] = updatedUser;

        if (currentUser?.id === existing.id) {
          const { password: _, ...safe } = updatedUser;
          setCurrentUser(safe);
        }

        resultUser = updatedUser;
        // Kirim langsung otomatis ke Supabase (user_accounts & profiles)
        syncProfileToSupabase(updatedUser);
        return next;
      } else {
        // Buat akun baru berbasis username
        const rawName = student.parentName
          .toLowerCase()
          .replace(/^(ibu|bapak|pak|bu)\s+/i, '')
          .replace(/[^a-z0-9]/g, '');

        let targetUsername = customCreds?.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!targetUsername) {
          targetUsername = `wali_${rawName || 'siswa'}`;
          let count = 1;
          while (prevUsers.some((u) => u.username.toLowerCase() === targetUsername)) {
            targetUsername = `wali_${rawName || 'siswa'}${count++}`;
          }
        }

        const newUserId = ensureUuid(student.parentUserId);
        const newUser: UserProfile & { password?: string } = {
          id: newUserId,
          username: targetUsername,
          fullName: student.parentName,
          role: 'wali',
          status: student.accountStatus,
          phone: student.parentPhone,
          position: 'Wali Murid',
          studentIds: [student.id],
          password: customCreds?.password || '123',
        };

        resultUser = newUser;
        // Kirim langsung otomatis ke Supabase (user_accounts & profiles)
        syncProfileToSupabase(newUser);
        return [...prevUsers, newUser];
      }
    });

    return resultUser;
  };

  // Otomatis pembuatan & sinkronisasi akun Guru/Pegawai berbasis USERNAME
  const syncTeacherAccount = (
    teacher: Teacher,
    customCreds?: { username?: string; password?: string; role?: UserRole; position?: string }
  ): UserProfile => {
    let resultUser: UserProfile = { ...teacher } as any;

    const assignedRole: UserRole =
      customCreds?.role ||
      teacher.role ||
      (teacher.position?.toLowerCase().includes('kepala')
        ? 'kepala'
        : teacher.position?.toLowerCase().includes('admin')
        ? 'admin'
        : 'guru');

    const assignedPosition =
      customCreds?.position ||
      teacher.position ||
      (assignedRole === 'kepala'
        ? 'Kepala Lembaga'
        : assignedRole === 'admin'
        ? 'Administrator Lembaga'
        : 'Guru Terapis');

    setUsers((prevUsers) => {
      const existingIndex = prevUsers.findIndex(
        (u) =>
          (teacher.userId && u.id === teacher.userId) ||
          (customCreds?.username && u.username && u.username.toLowerCase() === customCreds.username.toLowerCase().trim()) ||
          (u.teacherId && u.teacherId === teacher.id) ||
          (u.phone && teacher.phone && u.phone === teacher.phone) ||
          (u.fullName.toLowerCase() === teacher.name.toLowerCase() &&
            (u.role === 'guru' || u.role === 'kepala' || u.role === 'admin'))
      );

      if (existingIndex >= 0) {
        const existing = prevUsers[existingIndex];
        let targetUsername = existing.username;
        if (customCreds?.username && customCreds.username.trim()) {
          targetUsername = customCreds.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        }

        const updatedUser: UserProfile & { password?: string } = {
          ...existing,
          username: targetUsername,
          fullName: teacher.name,
          phone: teacher.phone || existing.phone,
          role: assignedRole,
          position: assignedPosition,
          status: teacher.status === 'cuti' ? 'nonaktif' : teacher.status,
          teacherId: teacher.id,
          password: customCreds?.password || existing.password || '123',
        };

        const next = [...prevUsers];
        next[existingIndex] = updatedUser;

        if (currentUser?.id === existing.id) {
          const { password: _, ...safe } = updatedUser;
          setCurrentUser(safe);
        }

        resultUser = updatedUser;
        // Kirim langsung otomatis ke Supabase (user_accounts & profiles)
        syncProfileToSupabase(updatedUser);
        return next;
      } else {
        const cleanName = teacher.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 10);
        const prefix =
          assignedRole === 'kepala' ? 'kpl_' : assignedRole === 'admin' ? 'adm_' : 'guru_';

        let targetUsername = customCreds?.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!targetUsername) {
          targetUsername = `${prefix}${cleanName || 'terapis'}`;
          let count = 1;
          while (prevUsers.some((u) => u.username.toLowerCase() === targetUsername)) {
            targetUsername = `${prefix}${cleanName || 'terapis'}${count++}`;
          }
        }

        const newUserId = ensureUuid(teacher.userId);
        const newUser: UserProfile & { password?: string } = {
          id: newUserId,
          username: targetUsername,
          fullName: teacher.name,
          role: assignedRole,
          position: assignedPosition,
          status: teacher.status === 'cuti' ? 'nonaktif' : teacher.status,
          phone: teacher.phone,
          teacherId: teacher.id,
          password: customCreds?.password || '123',
        };

        resultUser = newUser;
        // Kirim langsung otomatis ke Supabase (user_accounts & profiles)
        syncProfileToSupabase(newUser);
        return [...prevUsers, newUser];
      }
    });

    return resultUser;
  };

  // Sinkronisasi status pembekuan akun wali saat status siswa dibekukan/diaktifkan
  const syncFreezeStudent = (studentId: string, freeze: boolean) => {
    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.role === 'wali' && u.studentIds?.includes(studentId)) {
          const updated = {
            ...u,
            status: freeze ? ('dibekukan' as const) : ('aktif' as const),
          };
          if (currentUser?.id === u.id) {
            const { password: _, ...safe } = updated;
            setCurrentUser(safe);
          }
          syncProfileToSupabase(updated);
          return updated;
        }
        return u;
      })
    );
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isFrozen,
        login,
        logout,
        switchRole,
        hasPermission,
        permissions,
        updatePermissions,
        users,
        addUserAccount,
        updateUserAccount,
        deleteUserAccount,
        syncStudentParentAccount,
        syncTeacherAccount,
        syncFreezeStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
