import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, Eye, EyeOff, FileCheck2, Trash2, Upload, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { sanitizeFormData, validatePasswordStrength, validateFileUpload } from '../utils/security';

export const UserModal = ({ isOpen, onClose, editItem = null }) => {
  const { addUser, updateUser, currentUser } = useAuth();
  const { gradeTariffs } = useData();

  const [formData, setFormData] = useState({
    username: '',
    password: 'password123',
    name: '',
    email: '',
    role: 'surveyor',
    grade: 'GRADE 6 A',
    roleLabel: 'Marine Surveyor',
    description: '',
    avatarBg: '#10b981',
    signatureUrl: ''
  });

  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploadingTtd, setIsUploadingTtd] = useState(false);

  useEffect(() => {
    setErrorMsg('');
    setIsUploadingTtd(false);
    if (editItem) {
      setFormData({
        ...editItem,
        username: editItem.username || editItem.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
        password: '', // Don't prefill existing hashed password
        signatureUrl: editItem.signatureUrl || ''
      });
    } else {
      setFormData({
        username: '',
        password: 'password123',
        name: '',
        email: '',
        role: 'surveyor',
        grade: 'GRADE 6 A',
        roleLabel: 'Marine Surveyor',
        description: 'Petugas survei kelayakan kapal',
        avatarBg: '#10b981',
        signatureUrl: ''
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (role) => {
    let defaultLabel = 'Pengguna';
    let defaultBg = '#1e3a8a';

    if (role === 'admin' || role === 'developer') {
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
      email: prev.email || `${autoUsername || 'user'}@gmail.com`
    }));
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateFileUpload(file, 2 * 1024 * 1024);
    if (!validation.isValid) {
      setErrorMsg(validation.message);
      e.target.value = '';
      return;
    }

    setIsUploadingTtd(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `ttd_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
      setFormData((prev) => ({
        ...prev,
        signatureUrl: publicUrlData.publicUrl
      }));
    } catch (err) {
      console.error('Supabase upload failed, falling back to local base64:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          signatureUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingTtd(false);
    }
  };

  const handleRemoveSignature = () => {
    setFormData((prev) => ({
      ...prev,
      signatureUrl: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name || !formData.username) {
      setErrorMsg('Mohon isi Nama Lengkap dan Username!');
      return;
    }

    // Validate password if creating new user or if password field is filled during edit
    if (!editItem || formData.password) {
      const passCheck = validatePasswordStrength(formData.password || 'password123');
      if (!passCheck.isValid) {
        setErrorMsg(`Password kurang kuat: ${passCheck.errors.join(', ')}`);
        return;
      }
    }

    // Sanitize text inputs before saving to prevent XSS
    const sanitizedData = sanitizeFormData(formData);
    // Keep signatureUrl intact (data URL or supabase public URL)
    sanitizedData.signatureUrl = formData.signatureUrl;

    if (editItem) {
      if (!formData.password) {
        delete sanitizedData.password;
      }
      await updateUser(editItem.id, sanitizedData);
    } else {
      await addUser(sanitizedData);
    }
    onClose();
  };

  const passValidation = validatePasswordStrength(formData.password);

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} color="var(--accent-primary)" />
              <h3 className="modal-title">{editItem ? 'Ubah Akun Pengguna & TTD' : 'Tambah Akun Pengguna Baru'}</h3>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body" style={{ maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
              {errorMsg && (
                <div style={{ padding: '0.6rem 0.85rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1rem' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

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
                  <label className="form-label">
                    {editItem ? 'Password Baru (Opsional)' : 'Password Akun *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingRight: '2.5rem' }}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editItem ? 'Kosongkan jika tidak diubah' : 'Min 6 Karakter (A-Z, a-z, 0-9)...'}
                      required={!editItem}
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
                  {formData.password && (
                    <div style={{ fontSize: '0.7rem', color: passValidation.color, fontWeight: 700, marginTop: '0.2rem' }}>
                      Kekuatan: {passValidation.label} ({passValidation.score}/4)
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Pengguna</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Contoh: bambang@gmail.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: (formData.role === 'developer' || formData.role === 'monitor') ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Peran Pengguna (Role) *</label>
                  <select
                    className="form-select"
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <option value="surveyor">🕵️ Marine Surveyor (Input Laporan)</option>
                    <option value="keuangan">💰 Staff Keuangan (Kelola Kwitansi)</option>
                    <option value="kacab">👔 Kepala Cabang (Approval)</option>
                    <option value="monitor">🖥️ Layar Monitor (TV Display)</option>
                    {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                      <option value="admin">👨‍💼 Admin Utama (Full Control)</option>
                    )}
                    {currentUser?.role === 'developer' && (
                      <option value="developer">💻 Developer (Super Admin)</option>
                    )}
                  </select>
                </div>

                {formData.role !== 'developer' && formData.role !== 'monitor' && (
                  <div className="form-group">
                    <label className="form-label">Grade / Pangkat *</label>
                    <select
                      className="form-select"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    >
                      {(gradeTariffs || []).map((t) => (
                        <option key={t.id} value={t.grade}>{t.grade}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
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

              {/* UPLOAD SCAN TTD DIGITAL (ADMIN & DEVELOPER) */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 102, 204, 0.04) 0%, rgba(14, 165, 233, 0.08) 100%)',
                    border: '1.5px dashed var(--accent-primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <FileCheck2 size={16} />
                      <span>Scan Tanda Tangan Digital (TTD PNG / JPG)</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Terapkan di SPS & PDS
                    </span>
                  </div>

                  {formData.signatureUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#ffffff', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', minWidth: '120px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={formData.signatureUrl}
                          alt="Scan TTD"
                          style={{ maxHeight: '50px', maxWidth: '110px', objectFit: 'contain' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669' }}>
                          ✓ TTD Digital Tersimpan
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          Siap disematkan pada dokumen SPS & PDS surveyor ini.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleRemoveSignature}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        <Trash2 size={14} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1.25rem',
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        <Upload size={22} color="var(--accent-primary)" style={{ marginBottom: '0.35rem' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {isUploadingTtd ? 'Sedang Mengunggah...' : 'Klik untuk Upload Scan Tanda Tangan'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Format file disarankan PNG transparan atau JPG bersih (maks 2MB)
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={handleSignatureUpload}
                          disabled={isUploadingTtd}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Deskripsi / Catatan Peran</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '60px' }}
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
              <button type="submit" className="btn btn-primary" disabled={isUploadingTtd}>
                <Save size={16} />
                <span>Simpan Akun & TTD</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
