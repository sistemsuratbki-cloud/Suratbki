import React from 'react';
import { AlertTriangle, Trash2, X, RotateCcw } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger'
}) => {
  if (!isOpen) return null;

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

          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
            {message}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              {cancelText}
            </button>
            <button
              className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {type === 'danger' && <Trash2 size={16} />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
