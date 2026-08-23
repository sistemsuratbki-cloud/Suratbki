import React, { useState } from 'react';
import { X, KeyRound, Search, Save, Lock, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ModalPortal } from './ModalPortal';
import { validatePasswordStrength } from '../utils/security';

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const { findUserByIdentifier, verifyUserEmail, changePassword } = useAuth();

  const [identifierInput, setIdentifierInput] = useState('');
  const [emailVerifyInput, setEmailVerifyInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSearchUser = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifierInput) {
      setErrorMessage('Mohon masukkan Username atau Email Anda!');
      return;
    }

    const matched = findUserByIdentifier(identifierInput);
    if (!matched) {
      setErrorMessage(`Akun dengan username/email "${identifierInput}" tidak ditemukan!`);
      setFoundUser(null);
      return;
    }

    setFoundUser(matched);
    setEmailVerifyInput('');
    setIsVerified(false);
  };

  const handleVerifyEmail = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!foundUser) return;

    const isValidEmail = verifyUserEmail(foundUser.id, emailVerifyInput);
    if (!isValidEmail) {
      setErrorMessage('Email konfirmasi yang Anda masukkan tidak cocok dengan email terdaftar pada akun ini!');
      return;
    }

    setIsVerified(true);
    setErrorMessage('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!foundUser || !isVerified) return;

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru!');
      return;
    }

    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      setErrorMessage(`Password terlalu lemah: ${validation.errors.join(', ')}`);
      return;
    }

    await changePassword(foundUser.id, newPassword);
    setSuccessMessage(`Password akun ${foundUser.name} (@${foundUser.username}) berhasil diperbarui. Silakan login kembali.`);

    setTimeout(() => {
      handleModalClose();
    }, 2000);
  };

  const handleModalClose = () => {
    setIdentifierInput('');
    setEmailVerifyInput('');
    setFoundUser(null);
    setIsVerified(false);
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    onClose();
  };

  const passValidation = validatePasswordStrength(newPassword);

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
                  Pemulihan Access Akun
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Verifikasi email terdaftar sebelum mereset password
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

          {/* STEP 1: Search User */}
          {!foundUser && (
            <form onSubmit={handleSearchUser}>
              <div className="form-group">
                <label className="form-label">Username atau Email Akun *</label>
                <input
                  type="text"
                  className="form-input"
                  value={identifierInput}
                  onChange={(e) => setIdentifierInput(e.target.value)}
                  placeholder="Contoh: budi, siti, admin, atau budi@gmail.com..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  <Search size={16} />
                  Cari Akun
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Email Verification */}
          {foundUser && !isVerified && (
            <form onSubmit={handleVerifyEmail}>
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
                      @{foundUser.username || foundUser.role} • {foundUser.roleLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} color="var(--accent-primary)" />
                  <span>Konfirmasi Alamat Email Terdaftar *</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={emailVerifyInput}
                  onChange={(e) => setEmailVerifyInput(e.target.value)}
                  placeholder="Ketik email lengkap terdaftar (e.g. budi@gmail.com)..."
                  required
                />
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  🔒 Keamanan: Masukkan alamat email persis sesuai pendaftaran untuk membuktikan kepemilikan akun.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFoundUser(null)}>
                  Cari Akun Lain
                </button>
                <button type="submit" className="btn btn-primary">
                  <ShieldCheck size={16} />
                  Verifikasi Kepemilikan Email
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Reset Password with Strength Meter */}
          {foundUser && isVerified && (
            <form onSubmit={handleResetPassword}>
              <div style={{ padding: '0.65rem 0.85rem', background: '#d1fae5', color: '#065f46', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} />
                <span>Identitas Terverifikasi: {foundUser.name}</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={14} color="var(--accent-primary)" />
                  <span>Masukkan Password Baru *</span>
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ketik password baru (min 6 karakter, kombinasi A-Z, a-z, 0-9)..."
                  required
                />
                {newPassword && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', fontWeight: 700, color: passValidation.color }}>
                      <span>Kekuatan Password: {passValidation.label}</span>
                      <span>{passValidation.score}/4</span>
                    </div>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '0.2rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(passValidation.score / 4) * 100}%`, background: passValidation.color, transition: 'all 0.2s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsVerified(false)}>
                  Kembali
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!passValidation.isValid || newPassword !== confirmPassword}
                  style={{ opacity: !passValidation.isValid || newPassword !== confirmPassword ? 0.6 : 1 }}
                >
                  <Save size={16} />
                  Simpan Password Baru
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
