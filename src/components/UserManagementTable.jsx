import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Users, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserModal } from './UserModal';
import { ConfirmModal } from './ConfirmModal';
import { isValidSignature } from '../utils/signatureHelper';

export const UserManagementTable = () => {
  const { usersList, deleteUser, resetPassword, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [isConfirmResetPassOpen, setIsConfirmResetPassOpen] = useState(false);
  const [userToResetPass, setUserToResetPass] = useState(null);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const promptDelete = (item) => {
    if (currentUser && currentUser.id === item.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
      return;
    }
    setUserToDelete(item);
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const promptResetPass = (item) => {
    setUserToResetPass(item);
    setIsConfirmResetPassOpen(true);
  };

  const handleConfirmResetPass = () => {
    if (userToResetPass) {
      resetPassword(userToResetPass.id, 'password123');
      alert(`Password akun ${userToResetPass.name} (@${userToResetPass.username}) telah direset ke 'password123'!`);
      setUserToResetPass(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'developer':
        return <span className="badge badge-running" style={{ background: '#0f172a', color: '#38bdf8' }}>💻 Developer</span>;
      case 'admin':
        return <span className="badge badge-running" style={{ background: '#1e3a8a', color: '#ffffff' }}>👨‍💼 Admin Utama</span>;
      case 'surveyor':
        return <span className="badge badge-completed" style={{ background: '#10b981', color: '#ffffff' }}>🕵️ Marine Surveyor</span>;
      case 'keuangan':
        return <span className="badge badge-pending" style={{ background: '#f59e0b', color: '#000000' }}>💰 Staff Keuangan</span>;
      case 'kacab':
        return <span className="badge badge-running" style={{ background: '#64748b', color: '#ffffff' }}>👔 Kepala Cabang</span>;
      default:
        return <span className="badge badge-pending">Pengguna</span>;
    }
  };

  const filteredData = usersList.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.roleLabel && user.roleLabel.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'Semua' || user.role === roleFilter;
    const isVisible = user.role !== 'developer' || currentUser?.role === 'developer';

    return matchesSearch && matchesRole && isVisible;
  });

  return (
    <div className="card-section">
      <div className="card-header">
        <div className="card-title-group">
          <Users size={22} color="var(--accent-primary)" />
          <div>
            <h2 className="card-title">Manajemen Akun Pengguna & Surveyor</h2>
            <div className="card-subtitle">Kelola akun Admin, Marine Surveyor, Staff Keuangan, dan Reset Password</div>
          </div>
        </div>

        <div className="card-actions">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama, username, jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="Semua">Semua Role</option>
            <option value="admin">Admin Utama</option>
            <option value="surveyor">Marine Surveyor</option>
            <option value="keuangan">Staff Keuangan</option>
            <option value="kacab">Kepala Cabang</option>
          </select>

          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Tambah User Baru</span>
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Nama Pengguna</th>
              <th>Nama Akun (Username)</th>
              <th>Peran (Role)</th>
              <th>Grade</th>
              <th>TTD Scan</th>
              <th>Status Password</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-empty">
                  <div className="table-empty-icon">👥</div>
                  <p>Tidak ada akun pengguna yang sesuai dengan kriteria pencarian.</p>
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: item.avatarBg || '#1e3a8a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem'
                      }}
                    >
                      {item.name ? item.name.charAt(0) : 'U'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.name}
                      {currentUser && currentUser.id === item.id && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--accent-primary)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px', marginLeft: '0.5rem', fontWeight: 700 }}>
                          AKUN ANDA
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                      @{item.username || item.role}
                    </div>
                  </td>
                  <td>{getRoleBadge(item.role)}</td>
                  <td>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {(item.role === 'developer' || item.role === 'monitor') ? '-' : (item.grade || 'GRADE 6 A')}
                    </div>
                  </td>
                  <td>
                    {isValidSignature(item.signatureUrl) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img
                          src={item.signatureUrl}
                          alt="TTD"
                          style={{ height: '24px', maxWidth: '48px', objectFit: 'contain', background: '#f1f5f9', padding: '2px', borderRadius: '3px', border: '1px solid #cbd5e1' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const badge = e.target.parentElement?.querySelector('.ttd-badge');
                            if (badge) {
                              badge.className = 'badge badge-warning';
                              badge.textContent = '⚠️ TTD Rusak';
                            }
                          }}
                        />
                        <span className="badge badge-success ttd-badge" style={{ fontSize: '0.7rem' }}>✓ Ada TTD</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belum ada</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Shield size={14} color={item.password === 'password123' ? '#f59e0b' : '#10b981'} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: item.password === 'password123' ? '#f59e0b' : '#10b981' }}>
                        {item.password === 'password123' ? 'Default' : 'Khusus'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => promptResetPass(item)}
                        title="Reset Password Akun ke Default (password123)"
                      >
                        <KeyRound size={15} color="#f59e0b" />
                      </button>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => handleOpenEdit(item)}
                        title="Ubah Data & Password User"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => promptDelete(item)}
                        title="Hapus User"
                        disabled={currentUser && currentUser.id === item.id}
                        style={{ opacity: currentUser && currentUser.id === item.id ? 0.5 : 1 }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editItem={editingItem}
      />

      <ConfirmModal
        isOpen={isConfirmResetPassOpen}
        onClose={() => setIsConfirmResetPassOpen(false)}
        onConfirm={handleConfirmResetPass}
        title="Konfirmasi Reset Password Akun"
        message={userToResetPass ? `Apakah Anda yakin ingin mereset password akun ${userToResetPass.name} (@${userToResetPass.username}) menjadi password default 'password123'?` : ''}
        confirmText="Ya, Reset Password"
        type="warning"
      />

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Akun Pengguna"
        message={userToDelete ? `Apakah Anda yakin ingin menghapus akun ${userToDelete.name} (@${userToDelete.username})? Data pengguna ini akan dihapus dari sistem.` : ''}
        confirmText="Ya, Hapus Akun"
        type="danger"
      />
    </div>
  );
};
