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
import { fetchUsersFromCloud, saveUserToCloud, deleteUserFromCloud } from '../lib/cloudSync';

const AuthContext = createContext();

export const INITIAL_USERS = [
  {
    id: 'usr-muhson',
    username: 'muhson',
    password: 'password123',
    name: 'MUHSON NURROCHMAT',
    email: 'muhson@gmail.com',
    phone: '+620000000000',
    role: 'kacab',
    grade: 'GRADE 7C',
    roleLabel: 'KACAP/SURVEYOR',
    avatarBg: '#64748b',
    signatureUrl: '/signatures/kacab_muhson_signature.png',
    description: 'Kepala Cabang / Surveyor BKI Pontianak'
  },
  {
    id: 'usr-renza',
    username: 'renza',
    password: 'password123',
    name: 'RENZA MUHARAM',
    email: 'renza@gmail.com',
    phone: '+620000000001',
    role: 'admin',
    grade: 'GRADE 7C',
    roleLabel: 'Admin BKI',
    avatarBg: '#1e3a8a',
    description: 'Admin Utama BKI Pontianak'
  },
  {
    id: 'usr-bone',
    username: 'bone',
    password: 'password123',
    name: 'ALFIAN BONE PUTRA',
    email: 'bone@gmail.com',
    phone: '+620000000002',
    role: 'surveyor',
    grade: 'GRADE 6 A',
    roleLabel: 'Surveyor',
    avatarBg: '#10b981',
    signatureUrl: '/signatures/alfian_bone_handwritten.png',
    description: 'Surveyor BKI'
  },
  {
    id: 'usr-andre',
    username: 'andre',
    password: 'password123',
    name: 'ANDRE GUNTUR',
    email: 'andre@gmail.com',
    phone: '+620000000003',
    role: 'surveyor',
    grade: 'GRADE 6 A',
    roleLabel: 'Surveyor',
    avatarBg: '#059669',
    signatureUrl: '/signatures/andre_handwritten.png',
    description: 'Surveyor BKI'
  },
  {
    id: 'usr-sandi',
    username: 'sandi',
    password: 'password123',
    name: 'SANDI NANDARIANTO',
    email: 'sandi@gmail.com',
    phone: '+620000000004',
    role: 'surveyor',
    grade: 'GRADE 5 C',
    roleLabel: 'Surveyor',
    avatarBg: '#047857',
    signatureUrl: '/signatures/sandi_handwritten.png',
    description: 'Surveyor BKI'
  },
  {
    id: 'usr-septian',
    username: 'septian',
    password: 'password123',
    name: 'SEPTIAN AJI DEWANGKARA',
    email: 'septian@gmail.com',
    phone: '+620000000005',
    role: 'surveyor',
    grade: 'GRADE 5 C',
    roleLabel: 'Surveyor',
    avatarBg: '#065f46',
    signatureUrl: '/signatures/septian_handwritten.png',
    description: 'Surveyor BKI'
  },
  {
    id: 'usr-monitor',
    username: 'monitor',
    password: 'password123',
    name: 'TV Display Monitor',
    email: 'monitor@gmail.com',
    phone: '+620000000006',
    role: 'monitor',
    grade: '-',
    roleLabel: 'Pengguna',
    avatarBg: '#8b5cf6',
    description: 'Display Monitor'
  },
  {
    id: 'usr-prasetya',
    username: 'admin',
    password: 'admin123',
    name: 'Prasetya',
    email: 'sistemsuratbki@gmail.com',
    phone: '+620000000007',
    role: 'admin',
    grade: '-',
    roleLabel: 'Admin BKI',
    avatarBg: '#eab308',
    description: 'Admin Sistem'
  },
  {
    id: 'usr-finance',
    username: 'finance',
    password: 'password123',
    name: 'ANONIM',
    email: 'finance@gmail.com',
    phone: '+620000000008',
    role: 'keuangan',
    grade: 'GRADE 5 C',
    roleLabel: 'Keuangan',
    avatarBg: '#f59e0b',
    description: 'Staff Keuangan BKI'
  }
];

export const AuthProvider = ({ children }) => {
  const [usersList, setUsersList] = useState(() => {
    const saved = localStorage.getItem('st_users_list');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  useEffect(() => {
    const loadCloudUsers = async () => {
      try {
        const cloudUsers = await fetchUsersFromCloud();
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          setUsersList(cloudUsers);
        } else {
          // If Supabase has no users yet, seed initial users to cloud
          INITIAL_USERS.forEach((u) => saveUserToCloud(u));
        }
      } catch (e) {
        console.warn('Failed loading users from cloud:', e);
      }
    };
    loadCloudUsers();
  }, []);

  useEffect(() => {
    const isReset = localStorage.getItem('st_users_reset_v5');
    if (!isReset) {
      setUsersList(INITIAL_USERS);
      localStorage.setItem('st_users_reset_v5', 'true');
    }
  }, []);

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
          let updatedUser = { ...user };
          
          if (updatedUser.username === 'admin' && adminPassVersion !== 'admin123_v1') {
            needsMigration = true;
            updatedUser.password = await hashPassword('admin123');
          }
          if (updatedUser.username === 'admin' && updatedUser.role !== 'admin') {
            needsMigration = true;
            updatedUser.role = 'admin';
            updatedUser.roleLabel = 'Admin BKI';
          }
          
          if ((updatedUser.username === 'bone' || (updatedUser.name && updatedUser.name.includes('BONE'))) && !updatedUser.signatureUrl) {
            needsMigration = true;
            updatedUser.signatureUrl = '/signatures/alfian_bone_handwritten.png';
          }
          if ((updatedUser.username === 'sandi' || (updatedUser.name && updatedUser.name.includes('SANDI'))) && !updatedUser.signatureUrl) {
            needsMigration = true;
            updatedUser.signatureUrl = '/signatures/sandi_handwritten.png';
          }
          if ((updatedUser.username === 'andre' || (updatedUser.name && updatedUser.name.includes('ANDRE'))) && !updatedUser.signatureUrl) {
            needsMigration = true;
            updatedUser.signatureUrl = '/signatures/andre_handwritten.png';
          }
          if (updatedUser.username === 'septian' || (updatedUser.name && updatedUser.name.includes('SEPTIAN'))) {
            if (updatedUser.name === 'SEPTIAN AJI' || !updatedUser.name.includes('DEWANGKARA')) {
              needsMigration = true;
              updatedUser.name = 'SEPTIAN AJI DEWANGKARA';
            }
            if (!updatedUser.signatureUrl) {
              needsMigration = true;
              updatedUser.signatureUrl = '/signatures/septian_handwritten.png';
            }
          }
          if ((updatedUser.username === 'muhson' || (updatedUser.name && updatedUser.name.includes('MUHSON'))) && !updatedUser.signatureUrl) {
            needsMigration = true;
            updatedUser.signatureUrl = '/signatures/kacab_muhson_signature.png';
          }
          
          if (!isPasswordHashed(updatedUser.password)) {
            needsMigration = true;
            const fallbackPw = updatedUser.username === 'admin' ? 'admin123' : (updatedUser.password || 'password123');
            updatedUser.password = await hashPassword(fallbackPw);
          }
          return updatedUser;
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
          email: 'monitor@gmail.com',
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
        setCurrentUser(prev => {
          if (prev && (prev.username === 'admin' || prev.id === 'usr-prasetya')) {
            const updated = { ...prev, role: 'admin', roleLabel: 'Admin BKI' };
            localStorage.setItem('st_auth_user', JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
      localStorage.setItem('st_admin_pass_v', 'admin123_v3');
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
    let updatedUserObj = null;

    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, password: hashedPw };
          updatedUserObj = updated;
          return updated;
        }
        return u;
      })
    );

    if (updatedUserObj) {
      await saveUserToCloud(updatedUserObj);
    }

    // Don't store password in currentUser
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev }));
    }
  }, [currentUser]);

  // Verify current password for the logged-in user (for change password flow and confirm modals)
  const verifyCurrentPassword = useCallback(async (inputPassword) => {
    if (!currentUser) return false;
    const fullUser = usersList.find((u) => u.id === currentUser.id || u.username === currentUser.username);
    if (!fullUser) return false;
    return await verifyPassword(inputPassword, fullUser.password);
  }, [currentUser, usersList]);

  // Reset Password by Admin (hashed)
  const resetPassword = useCallback(async (userId, defaultPass = 'password123') => {
    const hashedPw = await hashPassword(defaultPass);
    let updatedUserObj = null;

    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, password: hashedPw };
          updatedUserObj = updated;
          return updated;
        }
        return u;
      })
    );

    if (updatedUserObj) {
      await saveUserToCloud(updatedUserObj);
    }
  }, []);

  // User Management Actions for Admin
  const addUser = useCallback(async (userData) => {
    let roleLabel = 'Pengguna BKI';
    if (userData.role === 'admin' || userData.role === 'developer') roleLabel = 'Admin Utama BKI Pontianak';
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
    await saveUserToCloud(newUser);
  }, []);

  const updateUser = useCallback(async (id, updatedData) => {
    // If password is being changed, hash it
    let dataToSave = { ...updatedData };
    if (dataToSave.password && !isPasswordHashed(dataToSave.password)) {
      dataToSave.password = await hashPassword(dataToSave.password);
    }

    let oldUserObj = null;
    let updatedUserObj = null;
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          oldUserObj = u;
          const updated = { ...u, ...dataToSave };
          updatedUserObj = updated;
          return updated;
        }
        return u;
      })
    );

    if (updatedUserObj) {
      await saveUserToCloud(updatedUserObj);
    }

    if (oldUserObj && dataToSave.name && oldUserObj.name !== dataToSave.name) {
      try {
        window.dispatchEvent(
          new CustomEvent('st_user_renamed', {
            detail: { oldName: oldUserObj.name, newName: dataToSave.name, id }
          })
        );
      } catch (e) {
        console.warn('Dispatch st_user_renamed warning:', e);
      }
    }

    if (currentUser && currentUser.id === id) {
      const { password, ...safeUpdate } = dataToSave;
      setCurrentUser((prev) => ({ ...prev, ...safeUpdate }));
    }
  }, [currentUser]);

  const deleteUser = useCallback(async (id) => {
    if (currentUser && currentUser.id === id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login!');
      return;
    }
    setUsersList((prev) => prev.filter((u) => u.id !== id));
    await deleteUserFromCloud(id);
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
