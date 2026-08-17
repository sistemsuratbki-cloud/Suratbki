import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
  checkLoginLock,
  recordFailedLogin,
  resetLoginAttempts,
  createSession,
  isSessionValid,
  destroySession
} from '../utils/security';

const AuthContext = createContext();

export const INITIAL_USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'admin123',
    name: 'Prasetyo, ST (Admin BKI)',
    email: 'admin@bki.co.id',
    role: 'admin',
    grade: 'GRADE 6 A',
    roleLabel: 'Admin Utama BKI Pontianak',
    avatarBg: '#1e3a8a',
    description: 'Akses penuh seluruh sistem & manajemen pengguna BKI Cabang Pontianak'
  },
  {
    id: 'usr-surveyor-1',
    username: 'budi',
    password: 'password123',
    name: 'Budi Santoso, ST',
    email: 'budi@bki.co.id',
    role: 'surveyor',
    grade: 'GRADE 6 A',
    roleLabel: 'Senior Class Surveyor - Lambung & Statutory',
    avatarBg: '#10b981',
    description: 'Inspektur Klasifikasi Lambung & Sertifikasi Keselamatan BKI'
  },
  {
    id: 'usr-surveyor-2',
    username: 'siti',
    password: 'password123',
    name: 'Siti Rahmawati, ST',
    email: 'siti@bki.co.id',
    role: 'surveyor',
    grade: 'GRADE 6 B',
    roleLabel: 'Machinery & Marine Engineer Surveyor',
    avatarBg: '#059669',
    description: 'Inspektur Kelayakan Mesin Utama, Sistem Listrik & Sea Trial BKI'
  },
  {
    id: 'usr-surveyor-3',
    username: 'ahmad',
    password: 'password123',
    name: 'Ahmad Fauzi, ST',
    email: 'ahmad@bki.co.id',
    role: 'surveyor',
    grade: 'GRADE 5 A',
    roleLabel: 'Hull Inspector - Tanker & Tugboat',
    avatarBg: '#047857',
    description: 'Inspektur Palka, Ketebalan Pelat & Garis Muat (Load Line) BKI'
  },
  {
    id: 'usr-surveyor-4',
    username: 'dewi',
    password: 'password123',
    name: 'Dewi Lestari, ST',
    email: 'dewi@bki.co.id',
    role: 'surveyor',
    grade: 'GRADE 5 B',
    roleLabel: 'NavCom & Statutory Surveyor',
    avatarBg: '#065f46',
    description: 'Inspektur Peralatan Navigasi, Radio & Sistem Komunikasi Kapal'
  },
  {
    id: 'usr-keuangan',
    username: 'keuangan',
    password: 'password123',
    name: 'Rian Hidayat, SE',
    email: 'keuangan@bki.co.id',
    role: 'keuangan',
    grade: 'GRADE 5 B',
    roleLabel: 'Staff Keuangan BKI Pontianak',
    avatarBg: '#f59e0b',
    description: 'Kelola Kwitansi, Pembayaran Honorarium, & Tiket Perjalanan'
  },
  {
    id: 'usr-kacab',
    username: 'kacab',
    password: 'password123',
    name: 'Ir. H. Agus Susanto, MT',
    email: 'kacab@bki.co.id',
    role: 'kacab',
    grade: 'GRADE 6 A',
    roleLabel: 'Kepala Cabang BKI Pontianak',
    avatarBg: '#64748b',
    description: 'Overview Dasbor Eksekutif & Persetujuan (Approval) BKI Cabang Pontianak'
  }
];

export const AuthProvider = ({ children }) => {
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('st_users_list');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('st_auth_user');
    if (!savedUser) return null;

    // Check session validity
    if (!isSessionValid()) {
      localStorage.removeItem('st_auth_user');
      destroySession();
      return null;
    }

    return JSON.parse(savedUser);
  });

  const [passwordsMigrated, setPasswordsMigrated] = useState(false);

  // Sync usersList to localStorage
  useEffect(() => {
    localStorage.setItem('st_users_list', JSON.stringify(usersList));
  }, [usersList]);

  // Sync currentUser to localStorage (WITHOUT password)
  useEffect(() => {
    if (currentUser) {
      // Strip password from stored session for security
      const safeUser = { ...currentUser };
      delete safeUser.password;
      localStorage.setItem('st_auth_user', JSON.stringify(safeUser));
    } else {
      localStorage.removeItem('st_auth_user');
    }
  }, [currentUser]);

  // Auto-migrate plaintext passwords to hashed on first load & update admin password to admin123
  useEffect(() => {
    const migratePasswords = async () => {
      const adminPassVersion = localStorage.getItem('st_admin_pass_v');
      let needsMigration = false;

      const migratedUsers = await Promise.all(
        usersList.map(async (user) => {
          if (user.username === 'admin' && adminPassVersion !== 'admin123_v1') {
            needsMigration = true;
            const hashedPw = await hashPassword('admin123');
            return { ...user, password: hashedPw };
          }
          if (!isPasswordHashed(user.password)) {
            needsMigration = true;
            const fallbackPw = user.username === 'admin' ? 'admin123' : (user.password || 'password123');
            const hashedPw = await hashPassword(fallbackPw);
            return { ...user, password: hashedPw };
          }
          return user;
        })
      );

      if (!usersList.some(u => u.username === 'monitor')) {
        needsMigration = true;
        const hashedPw = await hashPassword('monitor123');
        migratedUsers.push({
          id: 'usr-monitor',
          username: 'monitor',
          password: hashedPw,
          name: 'TV Display Monitor',
          email: 'monitor@bki.co.id',
          role: 'monitor',
          grade: 'GRADE 6 A',
          roleLabel: 'Layar Monitor Khusus',
          avatarBg: '#0f172a',
          description: 'Akun khusus untuk menampilkan informasi di layar TV'
        });
      }

      if (needsMigration) {
        setUsersList(migratedUsers);
        localStorage.setItem('st_users_list', JSON.stringify(migratedUsers));
      }
      localStorage.setItem('st_admin_pass_v', 'admin123_v1');
      setPasswordsMigrated(true);
    };

    migratePasswords();
  }, [usersList, passwordsMigrated]);

  // Session expiry check — runs every 5 minutes
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      if (!isSessionValid()) {
        setCurrentUser(null);
        destroySession();
        alert('Sesi Anda telah kedaluwarsa (8 jam). Silakan login kembali.');
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser]);

  /**
   * Login with brute-force protection and password hashing.
   * Returns: { success, message, lockInfo? }
   */
  const login = useCallback(async (identifierOrUser, inputPassword = null) => {
    // Check rate limiting first
    const lockState = checkLoginLock();
    if (lockState.isLocked) {
      return {
        success: false,
        message: `Terlalu banyak percobaan login gagal. Akun dikunci selama ${lockState.remainingSeconds} detik. Silakan coba lagi nanti.`,
        lockInfo: lockState
      };
    }

    let targetUser = null;
    if (typeof identifierOrUser === 'string') {
      const searchStr = identifierOrUser.toLowerCase().trim();
      targetUser = usersList.find(
        (u) =>
          (u.username && u.username.toLowerCase() === searchStr) ||
          (u.email && u.email.toLowerCase() === searchStr) ||
          u.role === searchStr ||
          u.id === searchStr
      );
    } else {
      // Object passed (e.g., from user list click)
      targetUser = usersList.find((u) => u.id === identifierOrUser.id);
    }

    if (!targetUser) {
      // Generic error to prevent user enumeration
      const lockInfo = recordFailedLogin();
      return {
        success: false,
        message: 'Username/email atau password yang Anda masukkan salah!',
        lockInfo
      };
    }

    // Verify password
    if (inputPassword) {
      const passwordValid = await verifyPassword(inputPassword, targetUser.password);
      if (!passwordValid) {
        const lockInfo = recordFailedLogin();
        const remaining = 5 - lockInfo.attempts;
        return {
          success: false,
          message: remaining > 0
            ? `Username/email atau password yang Anda masukkan salah! (${remaining} percobaan tersisa)`
            : `Terlalu banyak percobaan gagal. Akun dikunci selama 2 menit.`,
          lockInfo
        };
      }
    }

    // Login success — reset rate limiter and create session
    resetLoginAttempts();
    createSession();

    // Set current user (without password in memory for safety)
    const safeUser = { ...targetUser };
    delete safeUser.password;
    setCurrentUser(safeUser);

    return { success: true, user: safeUser };
  }, [usersList]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    destroySession();
  }, []);

  // Find User by Username or Email for Forgot Password
  const findUserByIdentifier = useCallback((identifier) => {
    if (!identifier) return null;
    const searchStr = identifier.toLowerCase().trim();
    const found = usersList.find(
      (u) =>
        (u.username && u.username.toLowerCase() === searchStr) ||
        (u.email && u.email.toLowerCase() === searchStr)
    );
    if (!found) return null;
    // Return safe user info (no password)
    const { password, ...safeUser } = found;
    return safeUser;
  }, [usersList]);

  /**
   * Verify that an email matches a user account (for forgot password flow).
   */
  const verifyUserEmail = useCallback((userId, email) => {
    const user = usersList.find((u) => u.id === userId);
    if (!user || !user.email) return false;
    return user.email.toLowerCase().trim() === email.toLowerCase().trim();
  }, [usersList]);

  // Change Password (hashed)
  const changePassword = useCallback(async (userId, newPassword) => {
    const hashedPw = await hashPassword(newPassword);

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: hashedPw } : u))
    );

    // Don't store password in currentUser
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev }));
    }
  }, [currentUser]);

  // Verify current password for the logged-in user (for change password flow)
  const verifyCurrentPassword = useCallback(async (inputPassword) => {
    if (!currentUser) return false;
    const fullUser = usersList.find((u) => u.id === currentUser.id);
    if (!fullUser) return false;
    return await verifyPassword(inputPassword, fullUser.password);
  }, [currentUser, usersList]);

  // Reset Password by Admin (hashed)
  const resetPassword = useCallback(async (userId, defaultPass = 'password123') => {
    const hashedPw = await hashPassword(defaultPass);

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: hashedPw } : u))
    );
  }, []);

  // User Management Actions for Admin
  const addUser = useCallback(async (userData) => {
    let roleLabel = 'Pengguna BKI';
    if (userData.role === 'admin') roleLabel = 'Admin Utama BKI Pontianak';
    else if (userData.role === 'surveyor') roleLabel = 'Class Surveyor BKI';
    else if (userData.role === 'keuangan') roleLabel = 'Staff Keuangan BKI Pontianak';
    else if (userData.role === 'kacab') roleLabel = 'Kepala Cabang BKI Pontianak';

    const usernameGenerated = userData.username || userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Hash the password before storing
    const rawPassword = userData.password || 'password123';
    const hashedPw = await hashPassword(rawPassword);

    const newUser = {
      ...userData,
      id: `usr-${Date.now().toString().slice(-6)}`,
      username: usernameGenerated,
      password: hashedPw,
      grade: userData.grade || 'GRADE 6 A',
      roleLabel: userData.roleLabel || roleLabel,
      avatarBg: userData.avatarBg || (userData.role === 'surveyor' ? '#10b981' : userData.role === 'keuangan' ? '#f59e0b' : '#1e3a8a')
    };

    setUsersList((prev) => [newUser, ...prev]);
  }, []);

  const updateUser = useCallback(async (id, updatedData) => {
    // If password is being changed, hash it
    let dataToSave = { ...updatedData };
    if (dataToSave.password && !isPasswordHashed(dataToSave.password)) {
      dataToSave.password = await hashPassword(dataToSave.password);
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...dataToSave } : u))
    );

    if (currentUser && currentUser.id === id) {
      const { password, ...safeUpdate } = dataToSave;
      setCurrentUser((prev) => ({ ...prev, ...safeUpdate }));
    }
  }, [currentUser]);

  const deleteUser = useCallback((id) => {
    if (currentUser && currentUser.id === id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login!');
      return;
    }
    setUsersList((prev) => prev.filter((u) => u.id !== id));
  }, [currentUser]);

  const resetUsers = useCallback(() => {
    setUsersList(INITIAL_USERS);
    setPasswordsMigrated(false); // Will trigger re-migration
    localStorage.removeItem('st_users_list');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        role: currentUser?.role || null,
        usersList,
        demoUsers: usersList,
        addUser,
        updateUser,
        deleteUser,
        changePassword,
        verifyCurrentPassword,
        resetPassword,
        findUserByIdentifier,
        verifyUserEmail,
        resetUsers
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
