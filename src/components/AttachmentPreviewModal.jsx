import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Files, ExternalLink, Loader2 } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { parseAttachmentFiles } from '../utils/formatters';

export const AttachmentPreviewModal = ({
  isOpen,
  onClose,
  title = 'Pratinjau Dokumen Lampiran',
  fileData = null,
  fileName = '',
  files = null
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const fileList = React.useMemo(() => {
    if (files && Array.isArray(files) && files.length > 0) {
      return parseAttachmentFiles(files, title);
    }
    return parseAttachmentFiles(fileData || fileName || '', title);
  }, [files, fileData, fileName, title]);

  useEffect(() => {
    setActiveIndex(0);
  }, [isOpen, fileData, fileName, files]);

  const currentFile = fileList[activeIndex] || fileList[0] || { name: 'Dokumen', url: '', data: '' };
  const rawFile = currentFile.url || currentFile.data || currentFile.name || '';
  const isString = typeof rawFile === 'string';
  const hasBase64OrUrl = isString && (rawFile.startsWith('data:') || rawFile.startsWith('http://') || rawFile.startsWith('https://') || rawFile.startsWith('blob:'));
  
  const isImage = isString && (
    rawFile.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(currentFile.name || rawFile) ||
    (hasBase64OrUrl && !rawFile.includes('application/pdf'))
  );

  const isPdf = isString && (
    rawFile.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(currentFile.name || rawFile)
  );

  const displayName = currentFile.name || (isString && hasBase64OrUrl ? `Lampiran_${activeIndex + 1}` : rawFile) || 'Dokumen';

  // Fetch as ArrayBuffer for HTTP/HTTPS URLs to bypass iframe X-Frame-Options blocking, fix corrupted multipart headers & force valid MIME
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (isOpen && hasBase64OrUrl && (rawFile.startsWith('http://') || rawFile.startsWith('https://'))) {
      setIsLoadingFile(true);
      fetch(rawFile)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.arrayBuffer();
        })
        .then((buffer) => {
          if (!active) return;
          const uint8 = new Uint8Array(buffer);
          const fileNameLower = (currentFile.name || displayName || rawFile).toLowerCase();
          let forcedMimeType = 'application/octet-stream';

          if (isPdf || fileNameLower.endsWith('.pdf') || fileNameLower.includes('.pdf') || rawFile.toLowerCase().includes('.pdf')) {
            forcedMimeType = 'application/pdf';
          } else if (fileNameLower.endsWith('.png')) {
            forcedMimeType = 'image/png';
          } else if (fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg')) {
            forcedMimeType = 'image/jpeg';
          } else if (fileNameLower.endsWith('.webp')) {
            forcedMimeType = 'image/webp';
          }

          let finalBuffer = uint8;

          // Check if file contains %PDF (0x25, 0x50, 0x44, 0x46)
          let pdfStartIndex = -1;
          for (let i = 0; i < Math.min(uint8.length - 4, 4096); i++) {
            if (uint8[i] === 0x25 && uint8[i + 1] === 0x50 && uint8[i + 2] === 0x44 && uint8[i + 3] === 0x46) {
              pdfStartIndex = i;
              break;
            }
          }

          if (pdfStartIndex !== -1) {
            forcedMimeType = 'application/pdf';
            if (pdfStartIndex > 0) {
              // Extract pure PDF bytes, removing WebKitFormBoundary wrapper
              let pdfEndIndex = uint8.length;
              for (let i = uint8.length - 5; i >= pdfStartIndex; i--) {
                if (uint8[i] === 0x25 && uint8[i + 1] === 0x25 && uint8[i + 2] === 0x45 && uint8[i + 3] === 0x4F && uint8[i + 4] === 0x46) {
                  let end = i + 5;
                  while (end < uint8.length && (uint8[end] === 10 || uint8[end] === 13 || uint8[end] === 32)) {
                    end++;
                  }
                  pdfEndIndex = end;
                  break;
                }
              }
              finalBuffer = uint8.slice(pdfStartIndex, pdfEndIndex);
            }
          } else {
            // Check for image magic bytes if wrapped in multipart
            for (let i = 0; i < Math.min(uint8.length - 4, 4096); i++) {
              if (uint8[i] === 0x89 && uint8[i + 1] === 0x50 && uint8[i + 2] === 0x4E && uint8[i + 3] === 0x47) {
                finalBuffer = uint8.slice(i);
                forcedMimeType = 'image/png';
                break;
              }
              if (uint8[i] === 0xFF && uint8[i + 1] === 0xD8 && uint8[i + 2] === 0xFF) {
                finalBuffer = uint8.slice(i);
                forcedMimeType = 'image/jpeg';
                break;
              }
            }
          }

          const typedBlob = new Blob([finalBuffer], { type: forcedMimeType });
          createdUrl = URL.createObjectURL(typedBlob);
          setBlobUrl(createdUrl);
          setIsLoadingFile(false);
        })
        .catch((err) => {
          if (!active) return;
          console.warn('Fallback to direct URL for attachment:', err);
          setBlobUrl(rawFile);
          setIsLoadingFile(false);
        });
    } else {
      setBlobUrl(rawFile);
      setIsLoadingFile(false);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, rawFile, hasBase64OrUrl, isPdf]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (hasBase64OrUrl) {
      const a = document.createElement('a');
      a.href = blobUrl || rawFile;
      a.download = displayName.includes('.') ? displayName : `${displayName}.${isPdf ? 'pdf' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenExternal = () => {
    if (hasBase64OrUrl) {
      const targetUrl = blobUrl || rawFile;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : fileList.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < fileList.length - 1 ? prev + 1 : 0));
  };

  const activeSrc = blobUrl || rawFile;

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
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
            maxWidth: isPdf ? '940px' : '780px',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)'
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
              background: 'var(--bg-main, #f8fafc)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              {isPdf ? (
                <FileText size={18} color="#0284c7" />
              ) : isImage ? (
                <ImageIcon size={18} color="#0284c7" />
              ) : (
                <Files size={18} color="#0284c7" />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title} {fileList.length > 1 && `(${activeIndex + 1}/${fileList.length})`}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {hasBase64OrUrl && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem' }}
                    title="Buka Dokumen di Tab Baru"
                  >
                    <ExternalLink size={13} />
                    <span>Buka Tab Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem' }}
                    title="Unduh File Saat Ini"
                  >
                    <Download size={13} />
                    <span>Unduh</span>
                  </button>
                </>
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

          {/* Multi-file Navigation Bar (if > 1 file) */}
          {fileList.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 1rem',
                background: '#f1f5f9',
                borderBottom: '1px solid #e2e8f0',
                gap: '0.5rem',
                overflowX: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                >
                  <ChevronLeft size={14} /> Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                >
                  Selanjutnya <ChevronRight size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {fileList.map((file, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    style={{
                      border: activeIndex === idx ? 'none' : '1px solid #cbd5e1',
                      background: activeIndex === idx ? '#0284c7' : '#ffffff',
                      color: activeIndex === idx ? '#ffffff' : '#334155',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: activeIndex === idx ? 700 : 500,
                      cursor: 'pointer',
                      boxShadow: activeIndex === idx ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {idx + 1}. {file.name || `Berkas ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Body */}
          <div
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              maxHeight: '75vh',
              overflow: 'auto',
              background: '#0f172a',
              position: 'relative'
            }}
          >
            {isLoadingFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                <Loader2 size={32} className="spinner" color="#38bdf8" />
                <span style={{ fontSize: '0.85rem' }}>Memuat dokumen pratinjau...</span>
              </div>
            ) : hasBase64OrUrl ? (
              isPdf ? (
                <div style={{ width: '100%', height: '70vh', display: 'flex', flexDirection: 'column' }}>
                  <object
                    data={activeSrc}
                    type="application/pdf"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '6px',
                      background: '#ffffff'
                    }}
                  >
                    <iframe
                      src={activeSrc}
                      title={displayName}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#ffffff'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: '#ffffff',
                          padding: '2rem',
                          textAlign: 'center'
                        }}
                      >
                        <FileText size={48} color="#38bdf8" style={{ marginBottom: '1rem' }} />
                        <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                          Browser Anda membutuhkan tautan langsung untuk membuka berkas PDF ini.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenExternal}
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          <ExternalLink size={15} />
                          <span>Buka Dokumen PDF di Tab Baru</span>
                        </button>
                      </div>
                    </iframe>
                  </object>
                </div>
              ) : (
                <img
                  src={activeSrc}
                  alt={displayName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '68vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}
                  onError={(e) => {
                    console.warn('Image render error, fallback');
                    e.target.style.display = 'none';
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
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-main, #f8fafc)'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {fileList.length > 1 ? `Menampilkan ${activeIndex + 1} dari ${fileList.length} lampiran` : '1 berkas lampiran'}
            </div>
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


