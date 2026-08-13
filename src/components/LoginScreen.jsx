import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ArrowRight, UserCheck, Wallet, User, KeyRound, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { BKILogo } from './BKILogo';
import { checkLoginLock } from '../utils/security';

export const LoginScreen = () => {
  const { login, demoUsers } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState(demoUsers[1]?.id || demoUsers[0]?.id);
  const [identifierInput, setIdentifierInput] = useState(demoUsers[1]?.username || 'budi');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Rate limiting UI state
  const [lockCountdown, setLockCountdown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Check lock state on mount
  useEffect(() => {
    const lockState = checkLoginLock();
    if (lockState.isLocked) {
      setLockCountdown(lockState.remainingSeconds);
      setFailedAttempts(lockState.attempts);
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockCountdown <= 0) return;

    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockCountdown]);

  const handleUserSelect = (user) => {
    setSelectedUserId(user.id);
    setIdentifierInput(user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    // Do NOT auto-fill password — user must type it manually
    setPasswordInput('');
    setErrorMessage('');
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (lockCountdown > 0) {
      setErrorMessage(`Login dikunci. Tunggu ${lockCountdown} detik lagi.`);
      return;
    }

    if (!identifierInput || !passwordInput) {
      setErrorMessage('Mohon isi username/email dan password!');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(identifierInput, passwordInput);

      if (result && !result.success) {
        setErrorMessage(result.message);

        if (result.lockInfo) {
          setFailedAttempts(result.lockInfo.attempts);
          if (result.lockInfo.isLocked) {
            setLockCountdown(result.lockInfo.remainingSeconds);
          }
        }
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [identifierInput, passwordInput, lockCountdown, login]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield size={18} />;
      case 'surveyor':
        return <UserCheck size={18} />;
      case 'keuangan':
        return <Wallet size={18} />;
      case 'kacab':
        return <User size={18} />;
      default:
        return <User size={18} />;
    }
  };

  const selectedUserObj = demoUsers.find((u) => u.id === selectedUserId) || demoUsers[0];
  const isLocked = lockCountdown > 0;

  const formatCountdown = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Glow Backgrounds */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(30, 58, 138, 0.25) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          maxWidth: '1020px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        {/* Left Side: BKI Pontianak Branding */}
        <div>
          <div className="brand" style={{ marginBottom: '1.5rem' }}>
            <BKILogo size={64} />
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                BKI Cabang Pontianak
              </h1>
              <div style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                PT Biro Klasifikasi Indonesia (Persero)
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
            Sistem Informasi Terpadu Surat Tugas, Kwitansi Honorarium, dan Pengisian Laporan Survei Klasifikasi Kapal Wilayah Kalimantan Barat.
          </p>


        </div>

        {/* Right Side: User Account Selection */}
        <div
          className="card-section"
          style={{
            padding: '2rem',
            margin: 0,
            background: 'var(--bg-card-solid)',
            borderColor: 'var(--border-color-strong)'
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Pilih Akun Personel BKI Pontianak
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Klik salah satu akun lalu masukkan password untuk login:
            </p>
          </div>

          {/* User Selection List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {demoUsers.map((user) => {
              const isSelected = selectedUserId === user.id;
              return (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  style={{
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: isSelected ? 'var(--accent-light)' : 'var(--bg-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: user.avatarBg,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        Akun: <strong style={{ color: 'var(--accent-primary)' }}>@{user.username || user.role}</strong> • {user.roleLabel}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}
                    >
                      DIPILIH
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#dc2626' }}>
                  🔒 Login Dikunci — Terlalu Banyak Percobaan Gagal
                </div>
                <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '0.1rem' }}>
                  Coba lagi dalam <strong style={{ fontSize: '1rem' }}>{formatCountdown(lockCountdown)}</strong> ({failedAttempts}/5 percobaan)
                </div>
              </div>
            </div>
          )}

          {errorMessage && !isLocked && (
            <div style={{ padding: '0.6rem 0.85rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <KeyRound size={14} color="var(--accent-primary)" />
                <span>Username atau Email BKI *</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="Ketik username atau email BKI (budi, siti, admin@bki.co.id)..."
                required
                disabled={isLocked}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                  <Lock size={14} color="var(--accent-primary)" />
                  <span>Password Akun *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.775rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Lupa Password?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password..."
                  required
                  disabled={isLocked}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
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
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Failed attempts indicator */}
            {failedAttempts > 0 && failedAttempts < 5 && !isLocked && (
              <div style={{ fontSize: '0.725rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={13} />
                <span>Percobaan gagal: {failedAttempts}/5 — Akun akan dikunci setelah 5x gagal</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', opacity: isLocked || isLoading ? 0.6 : 1 }}
              disabled={isLocked || isLoading}
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : isLocked ? (
                <>
                  <Lock size={16} />
                  <span>Login Dikunci ({formatCountdown(lockCountdown)})</span>
                </>
              ) : (
                <>
                  <span>Masuk Sebagai {selectedUserObj ? selectedUserObj.name : 'Personel'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
