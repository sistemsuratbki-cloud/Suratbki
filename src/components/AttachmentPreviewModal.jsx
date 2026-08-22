import React from 'react';
import { X, Download, FileText, Image as ImageIcon, ExternalLink, AlertCircle } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

export const AttachmentPreviewModal = ({ isOpen, onClose, title = 'Pratinjau Dokumen Lampiran', fileData = null, fileName = '' }) => {
  if (!isOpen) return null;

  const rawFile = fileData || fileName || '';
  const isString = typeof rawFile === 'string';
  const hasBase64OrUrl = isString && (rawFile.startsWith('data:') || rawFile.startsWith('http://') || rawFile.startsWith('https://') || rawFile.startsWith('blob:'));
  
  const isImage = isString && (
    rawFile.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName || rawFile) ||
    (hasBase64OrUrl && !rawFile.includes('application/pdf'))
  );

  const isPdf = isString && (
    rawFile.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(fileName || rawFile)
  );

  const displayName = fileName || (isString && hasBase64OrUrl ? 'Lampiran_Dokumen' : rawFile) || 'Dokumen';

  const handleDownload = () => {
    if (hasBase64OrUrl) {
      const a = document.createElement('a');
      a.href = rawFile;
      a.download = displayName.includes('.') ? displayName : `${displayName}.${isPdf ? 'pdf' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
          animation: 'fadeIn 0.15s ease'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border-color, #e2e8f0)',
            width: '100%',
            maxWidth: isPdf ? '880px' : '720px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--bg-main, #f8fafc)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              {isPdf ? (
                <FileText size={18} color="#0284c7" />
              ) : isImage ? (
                <ImageIcon size={18} color="#0284c7" />
              ) : (
                <FileText size={18} color="#0284c7" />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {hasBase64OrUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.65rem' }}
                  title="Unduh File"
                >
                  <Download size={13} />
                  <span>Unduh</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary, #64748b)',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px'
                }}
                title="Tutup Pratinjau"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxHeight: '75vh',
              overflow: 'auto',
              background: '#0f172a'
            }}
          >
            {hasBase64OrUrl ? (
              isPdf ? (
                <iframe
                  src={rawFile}
                  title={displayName}
                  style={{
                    width: '100%',
                    height: '68vh',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#ffffff'
                  }}
                />
              ) : (
                <img
                  src={rawFile}
                  alt={displayName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '68vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                />
              )
            ) : (
              /* Fallback Card for Mock / Text filename */
              <div
                style={{
                  background: 'var(--bg-card, #ffffff)',
                  borderRadius: '10px',
                  padding: '2rem 1.5rem',
                  maxWidth: '420px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(2, 132, 199, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem auto'
                  }}
                >
                  <FileText size={28} color="#0284c7" />
                </div>
                <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {displayName}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
                  Lampiran telah terdaftar dan terverifikasi di sistem BKI oleh Surveyor.
                </p>
                <div
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.4rem 0.8rem',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}
                >
                  ✓ Status: Terlampir & Siap Dicek Admin
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-main, #f8fafc)'
            }}
          >
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onClose}
              style={{ fontSize: '0.8rem', padding: '0.35rem 1rem' }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
