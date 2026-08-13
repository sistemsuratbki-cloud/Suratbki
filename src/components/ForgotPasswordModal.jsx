import React, { useState } from 'react';
import { X, KeyRound, Search, CheckCircle2, Save, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { findUserByIdentifier, changePassword, login } = useAuth();

  const [identifierInput, setIdentifierInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [newPassword, setNewPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSearchUser = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifierInput) {
      setErrorMessage('Mohon masukkan Nama Akun (Username) atau Email Anda!');
      return;
    }

    const matched = findUserByIdentifier(identifierInput);
    if (!matched) {
      setErrorMessage(`Akun dengan username atau email "${identifierInput}" tidak ditemukan!`);
      setFoundUser(null);
      return;
    }

    setFoundUser(matched);
    setNewPassword('password123');
  };

  const handleResetAndLogin = (e) => {
    e.preventDefault();
    if (!foundUser || !newPassword) return;

    changePassword(foundUser.id, newPassword);
    setSuccessMessage(`Password akun ${foundUser.name} (@${foundUser.username}) telah dipulihkan!`);

    setTimeout(() => {
      login(foundUser, newPassword);
      onClose();
    }, 900);
  };

  const handleModalClose = () => {
    setIdentifierInput('');
    setFoundUser(null);
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={handleModalClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '520px', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none', background: 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <KeyRound size={22} />
              </div>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Lupa Password Akun
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Pemulihan akses akun surveyor & personel
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-icon" onClick={handleModalClose}>
              <X size={18} />
            </button>
          </div>

          {errorMessage && (
            <div style={{ padding: '0.65rem 0.9rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '0.65rem 0.9rem', background: '#d1fae5', color: '#065f46', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1rem' }}>
              ✅ {successMessage}
            </div>
          )}

          {!foundUser ? (
            /* Step 1: Search User */
            <form onSubmit={handleSearchUser}>
              <div className="form-group">
                <label className="form-label">Masukkan Username atau Email Akun Anda *</label>
                <input
                  type="text"
                  className="form-input"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="Contoh: budi, siti, admin, atau budi@penapras.id..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Search size={16} />
                  Cari Akun Saya
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Account Found - Reset Password */
            <form onSubmit={handleResetAndLogin}>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color-strong)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: foundUser.avatarBg || '#1e3a8a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem'
                    }}
                  >
                    {foundUser.name ? foundUser.name.charAt(0) : 'U'}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {foundUser.name}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                      @{foundUser.username || foundUser.role} • {foundUser.email}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={14} color="var(--accent-primary)" />
                  <span>Masukkan Password Baru Anda *</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik password baru..."
                  required
                />
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Atau gunakan password pemulihan default: <strong style={{ color: 'var(--accent-primary)' }}>password123</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFoundUser(null)}>
                  Cari Akun Lain
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  Simpan Password & Masuk Akun
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
