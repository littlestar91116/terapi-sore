import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AppModule, RolePermission } from '../types';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'terapi_current_user';
const LOCAL_STORAGE_PERMS_KEY = 'terapi_role_permissions';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          };
          setCurrentUser(userObj);
          return { success: true };
        }
      } catch (e) {
        console.warn('Gagal cek auth supabase, beralih ke data lokal:', e);
      }
    }

    // Fallback: Login dengan data bawaan
    const matched = SEED_USERS.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (matched) {
      if (matched.password && password && matched.password !== password) {
        return { success: false, message: 'Password salah. (Admin default: 12345, lainnya: 123)' };
      }
      const { password: _, ...safeUser } = matched;
      setCurrentUser(safeUser);
      return { success: true };
    }

    return {
      success: false,
      message: 'Username tidak ditemukan. Coba: admin, kepala, guru, wali, atau wali_beku',
    };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchRole = (role: UserRole, accountStatus: 'aktif' | 'dibekukan' = 'aktif') => {
    const userForRole = SEED_USERS.find(
      (u) => u.role === role && (accountStatus === 'dibekukan' ? u.status === 'dibekukan' : u.status === 'aktif')
    ) || SEED_USERS.find((u) => u.role === role) || SEED_USERS[0];

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
