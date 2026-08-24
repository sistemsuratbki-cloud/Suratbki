import React, { useState, useEffect, useRef } from 'react';
import { X, Download, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, Files, ExternalLink, Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { parseAttachmentFiles } from '../utils/formatters';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF.js worker init:', e);
}

// Sub-component for rendering PDF onto HTML5 Canvas
const PdfCanvasViewer = ({ arrayBuffer, pdfUrl, onErrorFallback, onOpenExternal, displayName }) => {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setRenderError(false);
    setCurrentPage(1);

    const loadDoc = async () => {
      try {
        let loadingTask;
        if (arrayBuffer) {
          loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        } else if (pdfUrl) {
          loadingTask = pdfjsLib.getDocument({ url: pdfUrl });
        } else {
          throw new Error('No PDF source provided');
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        console.warn('PDF.js parse error:', err);
        if (!isCancelled) {
          setRenderError(true);
          setLoading(false);
        }
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
      }
    };
  }, [arrayBuffer, pdfUrl]);

  // Render specific page
  useEffect(() => {
    if (!pdfDocRef.current || loading || renderError) return;

    let isCurrent = true;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (!isCurrent) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('PDF page render warning:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCurrent = false;
    };
  }, [currentPage, scale, loading, renderError]);

  if (renderError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: '320px', color: '#ffffff', padding: '2rem', textAlign: 'center'
      }}>
        <FileText size={48} color="#38bdf8" style={{ marginBottom: '1rem' }} />
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#ffffff' }}>Dokumen PDF Terlampir</h4>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '380px', marginBottom: '1.25rem' }}>
          Dokumen siap dibuka langsung di browser atau diunduh.
        </p>
        <button
          type="button"
          onClick={onOpenExternal}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1.25rem', fontWeight: 700, borderRadius: '8px' }}
        >
          <ExternalLink size={16} />
          <span>Buka Dokumen PDF di Tab Baru</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* PDF Controls Toolbar */}
      {!loading && numPages > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          padding: '0.45rem 0.85rem', background: '#1e293b', borderBottom: '1px solid #334155',
          borderRadius: '6px 6px 0 0', gap: '0.5rem', flexWrap: 'wrap'
        }}>
          {/* Page nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', opacity: currentPage <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 600 }}>
              Hal {currentPage} / {numPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', opacity: currentPage >= numPages ? 0.5 : 1 }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setScale(s => Math.max(0.6, Number((s - 0.2).toFixed(1))))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
              title="Perkecil"
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale(s => Math.min(2.5, Number((s + 0.2).toFixed(1))))}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
              title="Perbesar"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setScale(1.2)}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        style={{
          flex: 1, width: '100%', overflow: 'auto', display: 'flex',
          justifyContent: 'center', alignItems: 'flex-start', padding: '1rem',
          background: '#0f172a', minHeight: '400px', maxHeight: '68vh'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '0.75rem', color: '#94a3b8' }}>
            <Loader2 size={32} className="spinner" color="#38bdf8" />
            <span style={{ fontSize: '0.85rem' }}>Memuat halaman PDF...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              borderRadius: '4px',
              maxWidth: '100%',
              background: '#ffffff'
            }}
          />
        )}
      </div>
    </div>
  );
};

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
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState(null);
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
  
  const isPdf = isString && (
    rawFile.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(currentFile.name || rawFile) ||
    rawFile.toLowerCase().includes('.pdf')
  );

  const isImage = !isPdf && isString && (
    rawFile.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(currentFile.name || rawFile) ||
    hasBase64OrUrl
  );

  const displayName = currentFile.name || (isString && hasBase64OrUrl ? `Lampiran_${activeIndex + 1}` : rawFile) || 'Dokumen';

  // Fetch as ArrayBuffer for clean PDF / Image data
  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (isOpen && hasBase64OrUrl) {
      if (rawFile.startsWith('http://') || rawFile.startsWith('https://')) {
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
              setPdfArrayBuffer(finalBuffer.buffer);
            } else {
              setPdfArrayBuffer(buffer);
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
            setPdfArrayBuffer(null);
            setIsLoadingFile(false);
          });
      } else if (rawFile.startsWith('data:')) {
        // Base64 data URL
        try {
          const base64Parts = rawFile.split(',');
          const base64Data = base64Parts[1] || base64Parts[0];
          const binaryStr = atob(base64Data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          setPdfArrayBuffer(bytes.buffer);
        } catch (e) {
          console.warn('Base64 parse for PDF warning:', e);
        }
        setBlobUrl(rawFile);
        setIsLoadingFile(false);
      } else {
        setBlobUrl(rawFile);
        setIsLoadingFile(false);
      }
    } else {
      setBlobUrl(rawFile);
      setPdfArrayBuffer(null);
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
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              maxHeight: '75vh',
              overflow: 'hidden',
              background: '#0f172a',
              position: 'relative'
            }}
          >
            {isLoadingFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', padding: '2rem' }}>
                <Loader2 size={32} className="spinner" color="#38bdf8" />
                <span style={{ fontSize: '0.85rem' }}>Memuat dokumen pratinjau...</span>
              </div>
            ) : hasBase64OrUrl ? (
              isPdf ? (
                <PdfCanvasViewer
                  arrayBuffer={pdfArrayBuffer}
                  pdfUrl={activeSrc}
                  onOpenExternal={handleOpenExternal}
                  displayName={displayName}
                />
              ) : (
                <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
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
                </div>
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
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  margin: '1.5rem'
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



