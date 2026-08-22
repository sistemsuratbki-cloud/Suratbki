import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, RotateCcw, Lock, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { useAuth } from '../context/AuthContext';
import { verifyPassword } from '../utils/security';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger',
  requirePassword = false
}) => {
  const { currentUser, verifyCurrentPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = async (e) => {
    if (e) e.preventDefault();

    if (requirePassword) {
      if (!password.trim()) {
        setErrorMsg('Password wajib dimasukkan untuk melanjutkan tindakan ini.');
        return;
      }

      setIsVerifying(true);
      try {
        const isMatch = await verifyCurrentPassword(password);
        if (!isMatch) {
          setErrorMsg('Password salah! Tindakan dibatalkan demi keamanan.');
          setIsVerifying(false);
          return;
        }
      } catch (err) {
        setErrorMsg('Terjadi kesalahan verifikasi password.');
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    onConfirm();
    onClose();
  };

  const getIcon = () => {
    if (type === 'danger') {
      return (
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}
        >
          <AlertTriangle size={28} />
        </div>
      );
    }
    return (
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: 'var(--accent-light)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}
      >
        <RotateCcw size={28} />
      </div>
    );
  };

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          style={{ maxWidth: '460px', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {getIcon()}
            <button className="btn btn-secondary btn-icon" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {title}
          </h3>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: requirePassword ? '1rem' : '1.75rem' }}>
            {message}
          </p>

          {requirePassword && (
            <form onSubmit={handleConfirmClick} style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <Lock size={14} color="var(--accent-primary)" />
                <span>Masukkan Password Developer untuk Konfirmasi:</span>
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan password akun Anda..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg('');
                }}
                autoFocus
                style={{
                  borderColor: errorMsg ? '#ef4444' : undefined,
                  width: '100%'
                }}
              />
              {errorMsg && (
                <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', fontWeight: 600 }}>
                  ⚠️ {errorMsg}
                </div>
              )}
            </form>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isVerifying}>
              {cancelText}
            </button>
            <button
              className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleConfirmClick}
              disabled={isVerifying}
            >
              {type === 'danger' && <Trash2 size={16} />}
              <span>{isVerifying ? 'Memverifikasi...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
