import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';

export const UserModal = ({ isOpen, onClose, editItem = null }) => {
  const { addUser, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: 'password123',
    name: '',
    email: '',
    role: 'surveyor',
    roleLabel: 'Marine Surveyor',
    description: '',
    avatarBg: '#10b981'
  });

  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        username: editItem.username || editItem.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        password: editItem.password || 'password123'
      });
    } else {
      setFormData({
        username: '',
        password: 'password123',
        name: '',
        email: '',
        role: 'surveyor',
        roleLabel: 'Marine Surveyor',
        description: 'Petugas survei kelayakan kapal',
        avatarBg: '#10b981'
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (role) => {
    let defaultLabel = 'Pengguna';
    let defaultBg = '#1e3a8a';

    if (role === 'admin') {
      defaultLabel = 'Admin Utama';
      defaultBg = '#1e3a8a';
    } else if (role === 'surveyor') {
      defaultLabel = 'Marine Surveyor';
      defaultBg = '#10b981';
    } else if (role === 'keuangan') {
      defaultLabel = 'Staff Keuangan';
      defaultBg = '#f59e0b';
    } else if (role === 'kacab') {
      defaultLabel = 'Kepala Cabang';
      defaultBg = '#64748b';
    }

    setFormData((prev) => ({
      ...prev,
      role,
      roleLabel: defaultLabel,
      avatarBg: defaultBg
    }));
  };

  const handleNameChange = (nameVal) => {
    const autoUsername = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '');
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      username: prev.username || autoUsername,
      email: prev.email || `${autoUsername || 'user'}@penapras.id`
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert('Mohon isi Nama Lengkap, Username, dan Password!');
      return;
    }

    if (editItem) {
      updateUser(editItem.id, formData);
    } else {
      addUser(formData);
    }
    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Akun Pengguna' : 'Tambah Akun Pengguna Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nama Lengkap Pengguna / Surveyor *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Contoh: Capt. Bambang Hermawan, ST"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Akun / Username Login *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    placeholder="Contoh: bambang, budi, admin..."
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Password Akun *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Password..."
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Pengguna</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Contoh: bambang@penapras.id"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Peran Pengguna (Role) *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <option value="admin">👨‍💼 Admin Utama (Full Control)</option>
                    <option value="surveyor">🕵️ Marine Surveyor (Input Laporan)</option>
                    <option value="keuangan">💰 Staff Keuangan (Kelola Kwitansi)</option>
                    <option value="kacab">👔 Kepala Cabang (Approval)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Jabatan / Spesialisasi</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.roleLabel}
                    onChange={(e) => setFormData({ ...formData, roleLabel: e.target.value })}
                    placeholder="Contoh: Surveyor Lambung & SOLAS"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi / Catatan Peran</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '70px' }}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan wewenang atau area tugas..."
                />
              </div>

              {/* Avatar Theme Color Preset */}
              <div className="form-group">
                <label className="form-label">Warna Avatar Profil</label>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
                  {['#1e3a8a', '#10b981', '#f59e0b', '#dc2626', '#a855f7', '#64748b'].map((color) => (
                    <div
                      key={color}
                      onClick={() => setFormData({ ...formData, avatarBg: color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: color,
                        cursor: 'pointer',
                        border: formData.avatarBg === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                        boxShadow: formData.avatarBg === color ? 'var(--shadow-md)' : 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                Simpan Akun & Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
