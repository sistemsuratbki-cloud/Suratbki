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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const [lockCountdown, setLockCountdown] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const lockState = checkLoginLock();
    if (lockState.isLocked) {
      setLockCountdown(lockState.remainingSeconds);
      setFailedAttempts(lockState.attempts);
    }
  }, []);

  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) { setFailedAttempts(0); setErrorMessage(''); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (lockCountdown > 0) { setErrorMessage(`Login dikunci. Tunggu ${lockCountdown} detik lagi.`); return; }
    if (!identifierInput || !passwordInput) { setErrorMessage('Mohon isi username/email dan password!'); return; }
    setIsLoading(true);
    try {
      const result = await login(identifierInput, passwordInput);
      if (result && !result.success) {
        setErrorMessage(result.message);
        if (result.lockInfo) {
          setFailedAttempts(result.lockInfo.attempts);
          if (result.lockInfo.isLocked) setLockCountdown(result.lockInfo.remainingSeconds);
        }
      }
    } catch {
      setErrorMessage('Terjadi kesalahan saat login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [identifierInput, passwordInput, lockCountdown, login]);

  const isLocked = lockCountdown > 0;
  const formatCountdown = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: isMobile ? '1rem' : '2rem',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Decorative glows — hidden on mobile to save space */}
      {!isMobile && <>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(30,58,138,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(0,180,167,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      </>}

      <div style={{
        width: '100%',
        maxWidth: isMobile ? '420px' : '960px',
        display: isMobile ? 'flex' : 'grid',
        flexDirection: 'column',
        gridTemplateColumns: '1fr 1fr',
        gap: isMobile ? '1rem' : '2.5rem',
        alignItems: 'center',
        zIndex: 2
      }}>

        {/* ── Branding Section ── */}
        <div style={{ width: '100%' }}>
          {/* Logos row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: isMobile ? '0.75rem' : '1.25rem',
            flexWrap: 'nowrap',
            justifyContent: isMobile ? 'center' : 'flex-start'
          }}>
            <BKILogo size={isMobile ? 36 : 44} />
            <div style={{ height: '28px', width: '1.5px', background: 'var(--border-color)', flexShrink: 0 }} />
            <IDSurveyLogo height={isMobile ? 26 : 32} />
            <div style={{ height: '28px', width: '1.5px', background: 'var(--border-color)', flexShrink: 0 }} />
            <DanantaraLogo height={isMobile ? 24 : 30} />
          </div>

          {/* Title & tagline — compact on mobile */}
          <div style={{ marginBottom: isMobile ? '0.5rem' : '1rem', textAlign: isMobile ? 'center' : 'left' }}>
            <h1 style={{
              fontSize: isMobile ? '1.2rem' : '1.75rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.25,
              margin: 0
            }}>
              Sistem Informasi Surat Tugas & Survei Kapal
            </h1>
            <div style={{
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              color: 'var(--accent-primary)',
              fontWeight: 700,
              marginTop: '0.3rem'
            }}>
              PT BKI (Persero) — Cabang Madya Kelas Pontianak
            </div>
          </div>

          {!isMobile && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
              Portal resmi pengelolaan Surat Tugas Survei, Kwitansi Honorarium Surveyor, dan Laporan Kelaiklautan Kapal untuk wilayah kerja Kalimantan Barat.
            </p>
          )}
        </div>

        {/* ── Login Card ── */}
        <div style={{
          width: '100%',
          background: 'var(--bg-card-solid)',
          border: '1px solid var(--border-color-strong)',
          borderRadius: 'var(--radius-lg)',
          padding: isMobile ? '1.5rem 1.25rem' : '2.25rem',
          boxShadow: 'var(--shadow-lg)',
          boxSizing: 'border-box'
        }}>
          {/* Card header */}
          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'var(--accent-light)', color: 'var(--accent-primary)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.65rem'
            }}>
              <Lock size={20} />
            </div>
            <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Login ke Akun Anda
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
              Masukkan username atau email dan password Anda
            </p>
          </div>

          {/* Lockout banner */}
          {isLocked && (
            <div style={{
              padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.1)',
              border: '1.5px solid #ef4444', borderRadius: 'var(--radius-md)',
              marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#dc2626' }}>Login Dikunci</div>
                <div style={{ fontSize: '0.76rem', color: '#b91c1c' }}>
                  Coba lagi dalam <strong>{formatCountdown(lockCountdown)}</strong> ({failedAttempts}/5)
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMessage && !isLocked && (
            <div style={{
              padding: '0.6rem 0.85rem', background: '#fee2e2', color: '#dc2626',
              borderRadius: 'var(--radius-md)', fontSize: '0.8rem', fontWeight: 700,
              marginBottom: '1rem'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            {/* Username field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)',
                marginBottom: '0.4rem'
              }}>
                <KeyRound size={13} color="var(--accent-primary)" />
                Username atau Email BKI *
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="Username atau email BKI..."
                required
                disabled={isLocked}
                autoComplete="username"
                autoFocus={!isMobile}
              />
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0
                }}>
                  <Lock size={13} color="var(--accent-primary)" />
                  Password Akun *
                </label>
                <button type="button" onClick={() => setIsForgotModalOpen(true)} style={{
                  background: 'none', border: 'none', color: 'var(--accent-primary)',
                  fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', padding: 0,
                  textDecoration: 'underline', flexShrink: 0
                }}>
                  Lupa Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', paddingRight: '2.75rem' }}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password akun Anda..."
                  required
                  disabled={isLocked}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none', border: 'none',
                  cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                  display: 'flex', alignItems: 'center'
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Failed attempts */}
            {failedAttempts > 0 && failedAttempts < 5 && !isLocked && (
              <div style={{
                fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700,
                marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
                <AlertTriangle size={12} />
                Percobaan gagal: {failedAttempts}/5 — dikunci setelah 5x gagal
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%', padding: '0.85rem', marginTop: '0.25rem',
                opacity: isLocked || isLoading || isInitializing ? 0.65 : 1,
                fontSize: '0.95rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem', boxSizing: 'border-box'
              }}
              disabled={isLocked || isLoading || isInitializing}
            >
              {isInitializing ? '⏳ Memuat sistem...' :
               isLoading ? 'Memverifikasi...' :
               isLocked ? <><Lock size={15} /> Login Dikunci ({formatCountdown(lockCountdown)})</> :
               <><span>Masuk ke Sistem</span><ArrowRight size={17} /></>}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            textAlign: 'center', marginTop: '1.25rem', paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.72rem', color: 'var(--text-muted)'
          }}>
            🔒 Portal Resmi PT BKI (Persero) • IDSurvey
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
};
