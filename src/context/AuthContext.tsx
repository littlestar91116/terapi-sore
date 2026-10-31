import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AppModule, RolePermission, Student, Teacher } from '../types';
import { SEED_USERS, SEED_ROLE_PERMISSIONS } from '../data/seedData';
import { getSupabase } from '../lib/supabase';

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
const LOCAL_STORAGE_USERS_LIST_KEY = 'terapi_all_users_v2';
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
    // Tampilan awal web selalu ke halaman login
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

  const currentRole: UserRole = currentUser?.role || 'wali';
  const isFrozen: boolean = currentUser?.status === 'dibekukan';

  const login = async (username: string, password = ''): Promise<{ success: boolean; message?: string }> => {
    const supabase = getSupabase();

    // Cek database Supabase jika aktif
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.trim())
          .single();

        if (!error && data) {
          const userObj: UserProfile = {
            id: data.id,
            username: data.username,
            fullName: data.full_name,
            role: data.role as UserRole,
            status: data.status as 'aktif' | 'dibekukan' | 'nonaktif',
            phone: data.phone,
            email: data.email,
            position: data.position,
          };
          setCurrentUser(userObj);
          return { success: true };
        }
      } catch (e) {
        console.warn('Gagal cek auth supabase, beralih ke data lokal:', e);
      }
    }

    // Cek dari daftar akun dinamis (users)
    const targetUsername = username.trim().toLowerCase();
    const matched = users.find(
      (u) => u.username.toLowerCase() === targetUsername
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
      message: 'Username tidak ditemukan. Silakan periksa kembali atau hubungi Administrator Little Star Learning Center.',
    };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole, accountStatus: 'aktif' | 'dibekukan' = 'aktif') => {
    const userForRole = users.find(
      (u) => u.role === role && (accountStatus === 'dibekukan' ? u.status === 'dibekukan' : u.status === 'aktif')
    ) || users.find((u) => u.role === role) || users[0];

    const { password: _, ...safeUser } = userForRole;
    setCurrentUser({
      ...safeUser,
      status: accountStatus,
    });
  };

  const hasPermission = (module: AppModule, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
    // Admin selalu punya akses penuh
    if (currentRole === 'admin') return true;

    // Jika akun dibekukan, wali tidak boleh akses modul operasional
    if (isFrozen && currentRole === 'wali') {
      return false;
    }

    // Peran selain admin dilarang mengakses modul hak_akses
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

  // Direct Account Management
  const addUserAccount = (user: UserProfile & { password?: string }) => {
    setUsers((prev) => [...prev, user]);
  };

  const updateUserAccount = (user: Partial<UserProfile> & { id: string; password?: string }) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === user.id) {
          const updated = { ...u, ...user };
          if (currentUser?.id === user.id) {
            const { password: _, ...safe } = updated;
            setCurrentUser(safe);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUserAccount = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Otomatis sinkronisasi akun Wali Murid saat data siswa dibuat atau diedit
  const syncStudentParentAccount = (
    student: Student,
    customCreds?: { username?: string; password?: string }
  ): UserProfile => {
    let resultUser: UserProfile = { ...student } as any;

    setUsers((prevUsers) => {
      // Cari apakah sudah ada akun wali terkait
      const existingIndex = prevUsers.findIndex(
        (u) =>
          (student.parentUserId && u.id === student.parentUserId) ||
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
          targetUsername = customCreds.username.trim().toLowerCase();
        }

        const updatedUser: UserProfile & { password?: string } = {
          ...existing,
          username: targetUsername,
          fullName: student.parentName,
          phone: student.parentPhone || existing.phone,
          status: student.accountStatus, // Sinkron status aktif / dibekukan
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
        return next;
      } else {
        // Buat akun baru otomatis
        const rawName = student.parentName
          .toLowerCase()
          .replace(/^(ibu|bapak|pak|bu)\s+/i, '')
          .replace(/[^a-z0-9]/g, '');
        const baseUsername =
          customCreds?.username?.trim().toLowerCase() ||
          `wali_${rawName || 'siswa'}`;

        let finalUsername = baseUsername;
        let count = 1;
        while (prevUsers.some((u) => u.username.toLowerCase() === finalUsername)) {
          finalUsername = `${baseUsername}${count++}`;
        }

        const newUserId = student.parentUserId || `usr-wali-${Date.now().toString(36)}`;
        const newUser: UserProfile & { password?: string } = {
          id: newUserId,
          username: finalUsername,
          fullName: student.parentName,
          role: 'wali',
          status: student.accountStatus,
          phone: student.parentPhone,
          email: `${finalUsername}@wali.littlestar.id`,
          position: 'Wali Murid',
          studentIds: [student.id],
          password: customCreds?.password || '123',
        };

        resultUser = newUser;
        return [...prevUsers, newUser];
      }
    });

    return resultUser;
  };

  // Otomatis sinkronisasi akun Guru/Pegawai saat data guru dibuat atau diedit (dengan jabatan)
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
          (u.teacherId && u.teacherId === teacher.id) ||
          (u.phone && teacher.phone && u.phone === teacher.phone) ||
          (u.fullName.toLowerCase() === teacher.name.toLowerCase() &&
            (u.role === 'guru' || u.role === 'kepala' || u.role === 'admin'))
      );

      if (existingIndex >= 0) {
        const existing = prevUsers[existingIndex];
        let targetUsername = existing.username;
        if (customCreds?.username && customCreds.username.trim()) {
          targetUsername = customCreds.username.trim().toLowerCase();
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
        return next;
      } else {
        const cleanName = teacher.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 10);
        const prefix =
          assignedRole === 'kepala' ? 'kpl_' : assignedRole === 'admin' ? 'adm_' : 'guru_';
        const baseUsername =
          customCreds?.username?.trim().toLowerCase() || `${prefix}${cleanName || 'terapis'}`;

        let finalUsername = baseUsername;
        let count = 1;
        while (prevUsers.some((u) => u.username.toLowerCase() === finalUsername)) {
          finalUsername = `${baseUsername}${count++}`;
        }

        const newUserId = teacher.userId || `usr-${assignedRole}-${Date.now().toString(36)}`;
        const newUser: UserProfile & { password?: string } = {
          id: newUserId,
          username: finalUsername,
          fullName: teacher.name,
          role: assignedRole,
          position: assignedPosition,
          status: teacher.status === 'cuti' ? 'nonaktif' : teacher.status,
          phone: teacher.phone,
          email: `${finalUsername}@littlestar.id`,
          teacherId: teacher.id,
          password: customCreds?.password || '123',
        };

        resultUser = newUser;
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
