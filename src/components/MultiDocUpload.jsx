import React, { useRef, useState } from 'react';
import { Upload, X, Eye, FileText, Image as ImageIcon, Plus, Check, Loader2, HardDrive, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { validateFileUpload } from '../utils/security';
import { parseAttachmentFiles, serializeAttachmentFiles } from '../utils/formatters';
import { uploadUniversalFile } from '../utils/fileStorageHelper';
import { deleteFromGoogleDrive, isGoogleDriveUrl } from '../utils/googleDriveService';

export const MultiDocUpload = ({
  value = '',
  onChange,
  onPreview,
  title = 'Lampiran Dokumen',
  label = 'Upload Berkas',
  icon: Icon = FileText,
  color = '#0284c7',
  disabled = false,
  readOnly = false,
  isAdmin = false,
  bucketName = 'lampiran',
  folderContext = {},
  maxFileSize = 3 * 1024 * 1024 // 3 MB
}) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const currentFiles = React.useMemo(() => {
    return parseAttachmentFiles(value, title);
  }, [value, title]);

  const handleFiles = async (fileList) => {
    if (disabled || readOnly || !fileList || fileList.length === 0) return;
    const rawFiles = Array.from(fileList);

    // Validate each file
    const validFiles = [];
    for (const file of rawFiles) {
      const validation = validateFileUpload(file, maxFileSize);
      if (!validation.isValid) {
        toast.error(validation.message);
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(`0/${validFiles.length}`);

    const newUploaded = [];
    const gdriveConfig = getGoogleDriveConfig();
    const isDriveActive = gdriveConfig?.enabled && gdriveConfig?.webAppUrl;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress(`${i + 1}/${validFiles.length}`);

      try {
        const uploadRes = await uploadUniversalFile({
          file,
          folderContext: {
            ...folderContext,
            category: folderContext.category || title.replace(/[^a-zA-Z0-9_-]/g, '_')
          },
          category: folderContext.category || title.replace(/[^a-zA-Z0-9_-]/g, '_')
        });

        newUploaded.push({
          id: uploadRes.id || `file_${Date.now()}_${i}`,
          name: uploadRes.name || file.name,
          url: uploadRes.url,
          data: uploadRes.url,
          viewUrl: uploadRes.viewUrl || uploadRes.url,
          downloadUrl: uploadRes.downloadUrl || uploadRes.url,
          thumbnailUrl: uploadRes.thumbnailUrl,
          folderUrl: uploadRes.folderUrl,
          storageProvider: uploadRes.storageProvider
        });
      } catch (uploadErr) {
        console.error('MultiDoc upload error:', uploadErr);
        toast.error(`Gagal upload ${file.name}`);
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    const combined = [...currentFiles, ...newUploaded];
    const serialized = serializeAttachmentFiles(combined);
    if (onChange) {
      onChange(serialized, combined);
    }
    toast.success(`Berhasil mengunggah ${newUploaded.length} berkas.`);
  };

  const handleRemove = async (indexToRemove) => {
    if (disabled || readOnly) return;
    const removedFile = currentFiles[indexToRemove];

    // Delete from Google Drive if it's a GDrive file
    if (removedFile && (isGoogleDriveUrl(removedFile.url) || isGoogleDriveUrl(removedFile.data))) {
      const driveUrl = removedFile.url || removedFile.data;
      deleteFromGoogleDrive(driveUrl).then((res) => {
        if (res.success) {
          toast.success('File juga dihapus dari Google Drive');
        }
      }).catch(() => {});
    }

    const updated = currentFiles.filter((_, idx) => idx !== indexToRemove);
    const serialized = serializeAttachmentFiles(updated);
    if (onChange) {
      onChange(serialized, updated);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Hidden File Input */}
      {!disabled && !readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}

      {/* Read-Only Mode */}
      {readOnly ? (
        currentFiles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Check size={13} color="#059669" />
                <span>{currentFiles.length} berkas terlampir</span>
              </span>
              <button
                type="button"
                className="btn btn-sm"
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', background: color, color: '#ffffff', border: 'none', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                onClick={() => {
                  if (onPreview) {
                    onPreview({
                      isOpen: true,
                      title: title,
                      files: currentFiles,
                      fileName: currentFiles[0]?.name || title
                    });
                  }
                }}
              >
                <Eye size={12} />
                <span>Cek {currentFiles.length > 1 ? `Semua (${currentFiles.length})` : 'Lampiran'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-main)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Belum ada lampiran berkas
          </div>
        )
      ) : (
        /* Interactive Upload Mode (Surveyor, Admin, and Kacab) */
        <div>
          {/* Action Header / Add Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Bisa pilih lebih dari 1 file (Maks. 3 MB per file, PDF / Foto):
            </div>
            <button
              type="button"
              disabled={isUploading || disabled}
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-sm"
              style={{
                background: color,
                color: '#ffffff',
                border: 'none',
                padding: '0.25rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: isUploading ? 'not-allowed' : 'pointer'
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={12} className="spinner" />
                  <span>Mengunggah {uploadProgress}...</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>{currentFiles.length > 0 ? 'Tambah File' : 'Pilih File (Bisa Multi)'}</span>
                </>
              )}
            </button>
          </div>

          {/* List of Uploaded Files */}
          {currentFiles.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {currentFiles.map((file, idx) => {
                const isPdf = /\.pdf$/i.test(file.name || file.url || '');
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(2, 132, 199, 0.05)',
                      border: '1px solid rgba(2, 132, 199, 0.15)',
                      borderRadius: '5px',
                      padding: '0.3rem 0.55rem',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flex: 1 }}>
                      {isPdf ? (
                        <FileText size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                      ) : (
                        <ImageIcon size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={file.name}
                      >
                        {idx + 1}. {file.name}
                      </span>
                      {isGoogleDriveUrl(file.url || file.data) && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '3px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            flexShrink: 0
                          }}
                          title="Tersimpan di Google Drive"
                        >
                          <HardDrive size={10} />
                          <span>Drive</span>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (onPreview) {
                            onPreview({
                              isOpen: true,
                              title: `${title} (${idx + 1}/${currentFiles.length})`,
                              files: currentFiles,
                              fileData: file.url || file.data,
                              fileName: file.name
                            });
                          }
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                        title="Lihat Pratinjau"
                      >
                        <Eye size={11} /> Cek
                      </button>

                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => handleRemove(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Hapus file ini"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: '6px',
                padding: '0.6rem 0.75rem',
                textAlign: 'center',
                background: 'var(--bg-main)',
                cursor: disabled ? 'default' : 'pointer',
                fontSize: '0.73rem',
                color: 'var(--text-muted)'
              }}
            >
              {disabled ? 'Belum ada berkas terlampir' : 'Klik untuk memilih berkas tiket / kwitansi (bisa pilih beberapa file sekaligus)'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
