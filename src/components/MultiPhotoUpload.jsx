import React, { useState, useRef, useMemo } from 'react';
import { Camera, X, Plus, Image as ImageIcon, Eye, Trash2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MultiPhotoUpload({
  fileNames = '',
  fileData = '',
  fotoList = [],
  onChange,
  label = '1. Upload Foto (Dokumentasi/Kapal)',
  maxFiles = 20
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [previewImage, setPreviewImage] = useState(null); // { name, data }
  const fileInputRef = useRef(null);

  // Normalize initial files list from props
  const currentPhotos = useMemo(() => {
    if (Array.isArray(fotoList) && fotoList.length > 0) {
      return fotoList.filter(f => f && (f.name || f.data));
    }
    
    // Check if fileData is a JSON array string
    if (typeof fileData === 'string' && fileData.startsWith('[') && fileData.endsWith(']')) {
      try {
        const parsed = JSON.parse(fileData);
        if (Array.isArray(parsed)) return parsed.filter(f => f && (f.name || f.data));
      } catch (e) {
        // Not JSON
      }
    }

    // Parse comma-separated names and single or comma-separated data
    if (fileNames && typeof fileNames === 'string') {
      const names = fileNames.split(',').map(n => n.trim()).filter(Boolean);
      const datas = typeof fileData === 'string' && fileData ? fileData.split('|||').map(d => d.trim()) : [];
      
      return names.map((name, index) => ({
        name,
        data: datas[index] || (index === 0 ? fileData : '') || ''
      }));
    }

    return [];
  }, [fileNames, fileData, fotoList]);

  const notifyChange = (newPhotos) => {
    if (!onChange) return;
    const names = newPhotos.map(p => p.name).filter(Boolean).join(', ');
    const primaryData = newPhotos.length > 0 ? (newPhotos[0].data || '') : '';
    const allData = newPhotos.map(p => p.data || '').join('|||');

    onChange({
      fileFotoName: names,
      fileFotoData: allData || primaryData,
      fotoList: newPhotos
    });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    setIsUploading(true);
    setUploadProgress(`Mengunggah ${fileArray.length} berkas...`);

    const uploadedResults = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgress(`Mengunggah foto ${i + 1} dari ${fileArray.length}: ${file.name}...`);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      let fileUrl = '';
      try {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } catch (err) {
        // Fallback to local Base64
        fileUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      uploadedResults.push({
        name: file.name,
        data: fileUrl,
        size: file.size
      });
    }

    const updatedList = [...currentPhotos, ...uploadedResults];
    notifyChange(updatedList);
    setIsUploading(false);
    setUploadProgress('');

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove, e) => {
    e?.stopPropagation();
    const updated = currentPhotos.filter((_, idx) => idx !== indexToRemove);
    notifyChange(updated);
  };

  const handleClearAll = (e) => {
    e?.stopPropagation();
    notifyChange([]);
  };

  return (
    <div style={{ background: 'var(--bg-card-solid)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      {/* Header Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', margin: 0 }}>
          <Camera size={16} color="#0284c7" />
          <span>{label}</span>
          {currentPhotos.length > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)' }}>
              {currentPhotos.length} Foto
            </span>
          )}
        </label>

        {currentPhotos.length > 1 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--status-danger-text)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Hapus Semua ({currentPhotos.length})
          </button>
        )}
      </div>

      {/* Upload Trigger Dropzone / Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '1.5px dashed var(--border-color-strong)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 0.8rem',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          background: 'var(--bg-main)',
          transition: 'all 0.2s ease',
          marginBottom: currentPhotos.length > 0 ? '0.6rem' : '0'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color-strong)')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(2, 132, 199, 0.3)', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>{uploadProgress || 'Mengunggah foto...'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Upload size={16} color="#0284c7" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentPhotos.length === 0 ? 'Pilih atau Tarik Beberapa Foto (Multi-Upload)' : '+ Tambah Foto Lainnya...'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(Bisa pilih &gt; 1 foto)</span>
          </div>
        )}
      </div>

      {/* Grid Thumbnail Preview */}
      {currentPhotos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.5rem',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.2rem 0'
          }}
        >
          {currentPhotos.map((photo, idx) => {
            const isPdf = photo.name?.toLowerCase().endsWith('.pdf');
            const hasData = !!photo.data;

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  overflow: 'hidden',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Image / File Thumbnail */}
                <div
                  onClick={() => hasData && setPreviewImage(photo)}
                  style={{
                    width: '100%',
                    height: '65px',
                    borderRadius: '4px',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: hasData ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                  title={hasData ? 'Klik untuk melihat foto lebih besar' : photo.name}
                >
                  {isPdf ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
                      <FileText size={28} color="#ef4444" />
                      <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800 }}>PDF</span>
                    </div>
                  ) : hasData ? (
                    <img
                      src={photo.data}
                      alt={photo.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon size={24} color="var(--text-muted)" />
                  )}

                  {/* Hover Overlay */}
                  {hasData && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        opacity: 0,
                        transition: 'opacity 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                    >
                      <Eye size={16} />
                    </div>
                  )}
                </div>

                {/* File Name */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.2rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}
                    title={photo.name}
                  >
                    {photo.name}
                  </span>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={(e) => handleRemovePhoto(idx, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--status-danger-text)',
                      cursor: 'pointer',
                      padding: '0.1rem',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50%',
                      opacity: 0.8
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                    title="Hapus foto ini"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Size Image Preview Modal / Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-modal)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color-strong)',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-card-solid)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem' }}>
                <Camera size={16} color="#0284c7" />
                <span>Pratinjau Foto: {previewImage.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '75vh', overflow: 'auto' }}>
              {previewImage.name?.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewImage.data} title={previewImage.name} style={{ width: '80vw', height: '70vh', border: 'none' }} />
              ) : (
                <img
                  src={previewImage.data}
                  alt={previewImage.name}
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
