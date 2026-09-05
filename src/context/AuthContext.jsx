import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
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
    role: 'developer',
    grade: '-',
    roleLabel: 'Developer',
    avatarBg: '#eab308',
    description: 'Developer Sistem'
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
    try {
      // Force clear localStorage jika versi lama (sebelum rewrite AuthContext)
      const cacheVersion = localStorage.getItem('st_auth_cache_v');
      if (cacheVersion !== 'v5') {
        console.log('[Auth] Cache version mismatch, clearing localStorage for re-migration...');
        localStorage.removeItem('st_users_list');
        localStorage.removeItem('st_auth_user');
        localStorage.removeItem('st_admin_pass_v');
        localStorage.removeItem('st_users_reset_v5');
        localStorage.setItem('st_auth_cache_v', 'v5');
        return INITIAL_USERS;
      }
      const saved = localStorage.getItem('st_users_list');
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  // isInitializing: false secara default agar form login langsung siap digunakan tanpa menunggu cloud
  const [isInitializing, setIsInitializing] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('st_auth_user');
      if (!savedUser) return null;
      if (!isSessionValid()) {
        localStorage.removeItem('st_auth_user');
        destroySession();
        return null;
      }
      const parsed = JSON.parse(savedUser);
      // Force clear currentUser jika masih role lama (admin) — akan di-patch ulang setelah cloud load
      if (parsed && parsed.username === 'admin' && parsed.role !== 'developer') {
        const corrected = { ...parsed, role: 'developer', roleLabel: 'Developer' };
        localStorage.setItem('st_auth_user', JSON.stringify(corrected));
        return corrected;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Ref untuk pastikan init hanya jalan SEKALI — tidak peduli re-render
  const initDoneRef = useRef(false);

  // ── SINGLE INIT EFFECT ─────────────────────────────────────────────────
  // Satu useEffect untuk semua operasi startup: reset, migrate, cloud load
  // Tidak ada dependency yang bisa memicunya ulang.
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const runInit = async () => {
      // 1. Reset users jika belum pernah di-reset ke v5
      const isReset = localStorage.getItem('st_users_reset_v5');
      let baseUsers;
      if (!isReset) {
        baseUsers = INITIAL_USERS;
        localStorage.setItem('st_users_list', JSON.stringify(INITIAL_USERS));
        localStorage.setItem('st_users_reset_v5', 'true');
      } else {
        try {
          const saved = localStorage.getItem('st_users_list');
          baseUsers = saved ? JSON.parse(saved) : INITIAL_USERS;
        } catch {
          baseUsers = INITIAL_USERS;
        }
      }

      // 2. Migrate passwords — hanya jika belum v4
      const alreadyMigrated = localStorage.getItem('st_admin_pass_v') === 'admin123_v4';
      if (!alreadyMigrated) {
        let needsMigration = false;
        const migratedUsers = await Promise.all(
          baseUsers.map(async (user) => {
            const u = { ...user };
            if (u.username === 'admin' && u.role !== 'developer') {
              needsMigration = true;
              u.role = 'developer';
              u.roleLabel = 'Developer';
            }
            if ((u.username === 'bone' || (u.name && u.name.includes('BONE'))) && !u.signatureUrl) {
              needsMigration = true;
              u.signatureUrl = '/signatures/alfian_bone_handwritten.png';
            }
            if ((u.username === 'sandi' || (u.name && u.name.includes('SANDI'))) && !u.signatureUrl) {
              needsMigration = true;
              u.signatureUrl = '/signatures/sandi_handwritten.png';
            }
            if ((u.username === 'andre' || (u.name && u.name.includes('ANDRE'))) && !u.signatureUrl) {
              needsMigration = true;
              u.signatureUrl = '/signatures/andre_handwritten.png';
            }
            if (u.username === 'septian' || (u.name && u.name.includes('SEPTIAN'))) {
              if (!u.name || !u.name.includes('DEWANGKARA')) {
                needsMigration = true;
                u.name = 'SEPTIAN AJI DEWANGKARA';
              }
              if (!u.signatureUrl) {
                needsMigration = true;
                u.signatureUrl = '/signatures/septian_handwritten.png';
              }
            }
            if ((u.username === 'muhson' || (u.name && u.name.includes('MUHSON'))) && !u.signatureUrl) {
              needsMigration = true;
              u.signatureUrl = '/signatures/kacab_muhson_signature.png';
            }
            if (!isPasswordHashed(u.password)) {
              needsMigration = true;
              const fallback = u.username === 'admin' ? 'admin123' : (u.password || 'password123');
              u.password = await hashPassword(fallback);
            }
            return u;
          })
        );

        if (!baseUsers.some((u) => u.username === 'monitor')) {
          needsMigration = true;
          migratedUsers.push({
            id: 'usr-monitor',
            username: 'monitor',
            password: await hashPassword('monitor123'),
            name: 'TV Display Monitor',
            email: 'monitor@gmail.com',
            role: 'monitor',
            grade: '-',
            roleLabel: 'Layar Monitor Khusus',
            avatarBg: '#0f172a',
            description: 'Akun khusus untuk menampilkan informasi di layar TV'
          });
        }

        if (needsMigration) {
          baseUsers = migratedUsers;
          localStorage.setItem('st_users_list', JSON.stringify(migratedUsers));
          setUsersList(migratedUsers);
        }
        localStorage.setItem('st_admin_pass_v', 'admin123_v4');
      }

      // 3. Load dari cloud — TANPA seed jika cloud kosong (mencegah infinite POST)
      try {
        const cloudUsers = await fetchUsersFromCloud();
        if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          // Merge: cloud menang untuk data profil, tapi local INITIAL_USERS menang untuk role/roleLabel
          // Ini memastikan perubahan role di INITIAL_USERS selalu diterapkan
          const merged = cloudUsers.map((cu) => {
            const local = baseUsers.find((u) => u.id === cu.id || u.username === cu.username);
            const initial = INITIAL_USERS.find((u) => u.id === cu.id || u.username === cu.username);

            let result = { ...cu };

            // Password: pakai lokal jika sudah di-hash, cloud mungkin plaintext
            if (local && isPasswordHashed(local.password) && !isPasswordHashed(cu.password || '')) {
              result.password = local.password;
            }

            // Role & roleLabel: INITIAL_USERS selalu menang (mencegah cloud override migrasi role)
            if (initial) {
              result.role = initial.role;
              result.roleLabel = initial.roleLabel;
            }

            return result;
          });

          // Update cloud untuk user yang role-nya berubah
          const needsCloudUpdate = merged.filter((mu) => {
            const cu = cloudUsers.find((c) => c.id === mu.id);
            return cu && (cu.role !== mu.role || cu.roleLabel !== mu.roleLabel);
          });
          for (const u of needsCloudUpdate) {
            saveUserToCloud(u).catch(() => {});
          }

          localStorage.setItem('st_users_list', JSON.stringify(merged));
          setUsersList(merged);
        }
        // SENGAJA tidak seed ke cloud jika kosong — mencegah infinite POST loop
      } catch (e) {
        console.warn('[Auth] Cloud users load warning:', e.message);
      }

      // Init selesai — izinkan login
      setIsInitializing(false);
    };

    runInit();
  }, []); // ← BENAR-BENAR KOSONG: jalan sekali saat mount

  // Sync usersList ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem('st_users_list', JSON.stringify(usersList));
    } catch (e) {
      console.warn('[Auth] localStorage write error:', e);
    }
  }, [usersList]);

  // Sync currentUser ke localStorage (TANPA password)
  useEffect(() => {
    if (currentUser) {
      const safeUser = { ...currentUser };
      delete safeUser.password;
      localStorage.setItem('st_auth_user', JSON.stringify(safeUser));
    } else {
      localStorage.removeItem('st_auth_user');
    }
  }, [currentUser]);

  // Patch currentUser jika role-nya berubah di usersList (migrasi)
  useEffect(() => {
    if (!currentUser || isInitializing) return;
    const freshUser = usersList.find(u => u.id === currentUser.id || u.username === currentUser.username);
    if (freshUser && (freshUser.role !== currentUser.role || freshUser.roleLabel !== currentUser.roleLabel)) {
      const { password, ...safe } = freshUser;
      setCurrentUser(safe);
    }
  }, [usersList, currentUser, isInitializing]);

  // Session expiry check — setiap 5 menit
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

  // ── AUTH ACTIONS ───────────────────────────────────────────────────────

  const login = useCallback(async (identifierOrUser, inputPassword = null) => {
    // Tunggu sampai init selesai — cegah login dengan data plaintext
    if (isInitializing) {
      return { success: false, message: 'Sistem sedang memuat data. Mohon tunggu sebentar...' };
    }

    const lockState = checkLoginLock();
    if (lockState.isLocked) {
      return {
        success: false,
        message: `Terlalu banyak percobaan login gagal. Akun dikunci selama ${lockState.remainingSeconds} detik.`,
        lockInfo: lockState
      };
    }

    let targetUser = null;
    if (typeof identifierOrUser === 'string') {
      // Support format @username (strip @ prefix)
      const raw = identifierOrUser.trim();
      const searchStr = (raw.startsWith('@') ? raw.slice(1) : raw).toLowerCase();
      targetUser = usersList.find(
        (u) =>
          (u.username && u.username.toLowerCase() === searchStr) ||
          (u.email && u.email.toLowerCase() === searchStr) ||
          u.id === searchStr
      );
    } else {
      targetUser = usersList.find((u) => u.id === identifierOrUser.id);
    }

    if (!targetUser) {
      const lockInfo = recordFailedLogin();
      return { success: false, message: 'Username/email atau password yang Anda masukkan salah!', lockInfo };
    }

    if (inputPassword) {
      const passwordValid = await verifyPassword(inputPassword, targetUser.password);
      if (!passwordValid) {
        const lockInfo = recordFailedLogin();
        const remaining = 5 - lockInfo.attempts;
        return {
          success: false,
          message: remaining > 0
            ? `Username/email atau password salah! (${remaining} percobaan tersisa)`
            : 'Terlalu banyak percobaan gagal. Akun dikunci selama 2 menit.',
          lockInfo
        };
      }
    }

    resetLoginAttempts();
    createSession();
    const safeUser = { ...targetUser };
    delete safeUser.password;
    setCurrentUser(safeUser);
    return { success: true, user: safeUser };
  }, [usersList]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    destroySession();
  }, []);

  const findUserByIdentifier = useCallback((identifier) => {
    if (!identifier) return null;
    const searchStr = identifier.toLowerCase().trim();
    const found = usersList.find(
      (u) =>
        (u.username && u.username.toLowerCase() === searchStr) ||
        (u.email && u.email.toLowerCase() === searchStr)
    );
    if (!found) return null;
    const { password, ...safeUser } = found;
    return safeUser;
  }, [usersList]);

  const verifyUserEmail = useCallback((userId, email) => {
    const user = usersList.find((u) => u.id === userId);
    if (!user || !user.email) return false;
    return user.email.toLowerCase().trim() === email.toLowerCase().trim();
  }, [usersList]);

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
    if (updatedUserObj) await saveUserToCloud(updatedUserObj).catch(() => {});
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev }));
    }
  }, [currentUser]);

  const verifyCurrentPassword = useCallback(async (inputPassword) => {
    if (!currentUser) return false;
    const fullUser = usersList.find((u) => u.id === currentUser.id || u.username === currentUser.username);
    if (!fullUser) return false;
    return await verifyPassword(inputPassword, fullUser.password);
  }, [currentUser, usersList]);

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
    if (updatedUserObj) await saveUserToCloud(updatedUserObj).catch(() => {});
  }, []);

  const addUser = useCallback(async (userData) => {
    let roleLabel = 'Pengguna BKI';
    if (userData.role === 'admin' || userData.role === 'developer') roleLabel = 'Admin Utama BKI Pontianak';
    else if (userData.role === 'surveyor') roleLabel = 'Class Surveyor BKI';
    else if (userData.role === 'keuangan') roleLabel = 'Staff Keuangan BKI Pontianak';
    else if (userData.role === 'kacab') roleLabel = 'Kepala Cabang BKI Pontianak';

    const usernameGenerated = userData.username || userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hashedPw = await hashPassword(userData.password || 'password123');
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
    await saveUserToCloud(newUser).catch(() => {});
  }, []);

  const updateUser = useCallback(async (id, updatedData) => {
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
    if (updatedUserObj) await saveUserToCloud(updatedUserObj).catch(() => {});
    if (oldUserObj && dataToSave.name && oldUserObj.name !== dataToSave.name) {
      try {
        window.dispatchEvent(new CustomEvent('st_user_renamed', {
          detail: { oldName: oldUserObj.name, newName: dataToSave.name, id }
        }));
      } catch (e) {}
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
    await deleteUserFromCloud(id).catch(() => {});
  }, [currentUser]);

  const resetUsers = useCallback(() => {
    setUsersList(INITIAL_USERS);
    localStorage.removeItem('st_users_list');
    localStorage.removeItem('st_admin_pass_v');
    localStorage.removeItem('st_users_reset_v5');
    initDoneRef.current = false; // izinkan init ulang
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isInitializing,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
