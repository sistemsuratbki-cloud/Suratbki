import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, KeyRound, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { BKILogo } from './BKILogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { DanantaraLogo } from './DanantaraLogo';
import { checkLoginLock } from '../utils/security';

export const LoginScreen = () => {
  const { login, isInitializing } = useAuth();

  const [identifierInput, setIdentifierInput] = useState('');
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
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(30, 58, 138, 0.22) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-5%',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(0, 180, 167, 0.18) 0%, rgba(0,0,0,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          maxWidth: '960px',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2.5rem',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        {/* Left Side: Danantara, BKI & IDSurvey Branding */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <BKILogo size={46} />
            <div style={{ height: '32px', width: '1.5px', background: 'var(--border-color)' }} />
            <IDSurveyLogo height={34} />
            <div style={{ height: '32px', width: '1.5px', background: 'var(--border-color)' }} />
            <DanantaraLogo height={32} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              Sistem Informasi Surat Tugas & Survei Kapal
            </h1>
            <div style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '0.35rem' }}>
              PT Biro Klasifikasi Indonesia (Persero) — Cabang Madya Kelas Pontianak
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.65', margin: 0 }}>
            Portal resmi pengelolaan Surat Tugas Survei, Kwitansi Honorarium Surveyor, dan Laporan Kelaiklautan Kapal untuk wilayah kerja Kalimantan Barat.
          </p>
        </div>

        {/* Right Side: Professional Secure Login Form */}
        <div
          className="card-section"
          style={{
            padding: '2.25rem',
            margin: 0,
            background: 'var(--bg-card-solid)',
            borderColor: 'var(--border-color-strong)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <Lock size={22} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Login ke Akun Anda
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Masukkan username atau email dan password resmi Anda:
            </p>
          </div>

          {/* Lockout Warning Banner */}
          {isLocked && (
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1.5px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
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
            <div style={{ padding: '0.65rem 0.9rem', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <KeyRound size={14} color="var(--accent-primary)" />
                <span>Username atau Email BKI *</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="Masukkan username atau email BKI..."
                required
                disabled={isLocked}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
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
                  placeholder="Masukkan password akun Anda..."
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
              <div style={{ fontSize: '0.725rem', color: '#f59e0b', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={13} />
                <span>Percobaan gagal: {failedAttempts}/5 — Akun akan dikunci setelah 5x gagal</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', opacity: isLocked || isLoading || isInitializing ? 0.6 : 1, fontSize: '0.95rem' }}
              disabled={isLocked || isLoading || isInitializing}
            >
              {isInitializing ? (
                <span>⏳ Memuat sistem, harap tunggu...</span>
              ) : isLoading ? (
                <span>Memverifikasi Kredensial...</span>
              ) : isLocked ? (
                <>
                  <Lock size={16} />
                  <span>Login Dikunci ({formatCountdown(lockCountdown)})</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔒 Portal Resmi PT Biro Klasifikasi Indonesia (Persero) • IDSurvey
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
};
