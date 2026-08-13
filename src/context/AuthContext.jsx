import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const INITIAL_USERS = [
  {
    id: 'usr-admin',
    username: 'admin',
    password: 'password123',
    name: 'Prasetyo, ST (Admin BKI)',
    email: 'admin@bki.co.id',
    role: 'admin',
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
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    localStorage.setItem('st_users_list', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('st_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('st_auth_user');
    }
  }, [currentUser]);

  const login = (identifierOrUser, inputPassword = null) => {
    let targetUser = null;
    if (typeof identifierOrUser === 'string') {
      const searchStr = identifierOrUser.toLowerCase().trim();
      targetUser = usersList.find(
        (u) =>
          (u.username && u.username.toLowerCase() === searchStr) ||
          (u.email && u.email.toLowerCase() === searchStr) ||
          u.role === searchStr ||
          u.id === searchStr ||
          u.name.toLowerCase().includes(searchStr)
      );
    } else {
      targetUser = identifierOrUser;
    }

    if (!targetUser) {
      return { success: false, message: `Akun "${identifierOrUser}" tidak ditemukan!` };
    }

    // Verify password if provided
    if (inputPassword && targetUser.password && inputPassword !== targetUser.password) {
      return { success: false, message: 'Password yang Anda masukkan salah!' };
    }

    setCurrentUser(targetUser);
    return { success: true, user: targetUser };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Find User by Username or Email for Forgot Password
  const findUserByIdentifier = (identifier) => {
    if (!identifier) return null;
    const searchStr = identifier.toLowerCase().trim();
    return (
      usersList.find(
        (u) =>
          (u.username && u.username.toLowerCase() === searchStr) ||
          (u.email && u.email.toLowerCase() === searchStr) ||
          u.name.toLowerCase().includes(searchStr)
      ) || null
    );
  };

  // Change Password for Logged-In User
  const changePassword = (userId, newPassword) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: newPassword } : u))
    );

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, password: newPassword }));
    }
  };

  // Reset Password by Admin or Forgot Password Modal
  const resetPassword = (userId, defaultPass = 'password123') => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: defaultPass } : u))
    );

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, password: defaultPass }));
    }
  };

  // User Management Actions for Admin
  const addUser = (userData) => {
    let roleLabel = 'Pengguna BKI';
    if (userData.role === 'admin') roleLabel = 'Admin Utama BKI Pontianak';
    else if (userData.role === 'surveyor') roleLabel = 'Class Surveyor BKI';
    else if (userData.role === 'keuangan') roleLabel = 'Staff Keuangan BKI Pontianak';
    else if (userData.role === 'kacab') roleLabel = 'Kepala Cabang BKI Pontianak';

    const usernameGenerated = userData.username || userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newUser = {
      ...userData,
      id: `usr-${Date.now().toString().slice(-6)}`,
      username: usernameGenerated,
      password: userData.password || 'password123',
      roleLabel: userData.roleLabel || roleLabel,
      avatarBg: userData.avatarBg || (userData.role === 'surveyor' ? '#10b981' : userData.role === 'keuangan' ? '#f59e0b' : '#1e3a8a')
    };

    setUsersList((prev) => [newUser, ...prev]);
  };

  const updateUser = (id, updatedData) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedData } : u))
    );
    if (currentUser && currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...updatedData }));
    }
  };

  const deleteUser = (id) => {
    if (currentUser && currentUser.id === id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login!');
      return;
    }
    setUsersList((prev) => prev.filter((u) => u.id !== id));
  };

  const resetUsers = () => {
    setUsersList(INITIAL_USERS);
    localStorage.removeItem('st_users_list');
  };

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
        resetPassword,
        findUserByIdentifier,
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
