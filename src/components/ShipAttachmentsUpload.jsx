import React, { useState } from 'react';
import { FileText, Camera, Eye, Trash2, CheckCircle2, Upload, Anchor, FileCheck2, HardDrive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { validateFileUpload } from '../utils/security';
import { uploadUniversalFile } from '../utils/fileStorageHelper';
import { deleteFromGoogleDrive, isGoogleDriveUrl } from '../utils/googleDriveService';

export const ShipAttachmentsUpload = ({
  shipsDetail = [],
  onChangeShipsDetail,
  defaultShipName = '',
  defaultAgenda = '',
  folderContext = {},
  onSyncPrimaryFiles,
  disabled = false,
  onPreview
}) => {
  const [uploadingState, setUploadingState] = useState({}); // { `${shipIdx}_${fileType}`: true }

  // Resolve list of ships for upload
  const resolvedShips = React.useMemo(() => {
    if (Array.isArray(shipsDetail) && shipsDetail.length > 0) {
      return shipsDetail;
    }
    if (defaultShipName && defaultShipName.trim()) {
      const parsed = defaultShipName
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parsed.map((name) => ({
        namaKapal: name,
        noAgenda: defaultAgenda || '-',
        fileVisitName: '',
        fileVisitData: '',
        fileFotoName: '',
        fileFotoData: ''
      }));
    }
    return [
      {
        namaKapal: 'KAPAL UTAMA',
        noAgenda: defaultAgenda || '-',
        fileVisitName: '',
        fileVisitData: '',
        fileFotoName: '',
        fileFotoData: ''
      }
    ];
  }, [shipsDetail, defaultShipName, defaultAgenda]);

  const handleFileUpload = async (e, shipIdx, fileType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFileUpload(file, 3 * 1024 * 1024);
    if (!validation.isValid) {
      toast.error(validation.message);
      e.target.value = '';
      return;
    }

    const stateKey = `${shipIdx}_${fileType}`;
    setUploadingState((prev) => ({ ...prev, [stateKey]: true }));

    const targetShip = resolvedShips[shipIdx] || {};
    const shipName = targetShip.namaKapal || `Kapal #${shipIdx + 1}`;
    const fieldNameKey = fileType === 'visit' ? 'fileVisitName' : 'fileFotoName';
    const fieldDataKey = fileType === 'visit' ? 'fileVisitData' : 'fileFotoData';

    try {
      const uploadRes = await uploadUniversalFile({
        file,
        folderContext: {
          ...folderContext,
          subFolder: `${targetShip.noAgenda || defaultAgenda || 'SP'}_${shipName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          category: fileType === 'visit' ? '2_Bukti_Visit_Selfie' : '1_Foto_Dokumentasi'
        },
        category: fileType === 'visit' ? '2_Bukti_Visit_Selfie' : '1_Foto_Dokumentasi'
      });

      applyFileUpdate(shipIdx, fieldNameKey, fieldDataKey, uploadRes.name || file.name, uploadRes.url);
      toast.success(`Berhasil upload ${fileType === 'visit' ? 'Bukti Visit' : 'Foto Selfie'} untuk ${shipName}`);
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Gagal mengunggah file. Silakan coba lagi.');
    } finally {
      setUploadingState((prev) => ({ ...prev, [stateKey]: false }));
    }
  };

  const applyFileUpdate = (shipIdx, fieldNameKey, fieldDataKey, fileName, fileData) => {
    let updatedList = [...resolvedShips];
    if (!updatedList[shipIdx]) {
      updatedList[shipIdx] = { namaKapal: defaultShipName || `Kapal #${shipIdx + 1}` };
    }

    updatedList[shipIdx] = {
      ...updatedList[shipIdx],
      [fieldNameKey]: fileData,
      [fieldDataKey]: fileData,
      [`${fieldNameKey}_orig`]: fileName
    };

    if (onChangeShipsDetail) {
      onChangeShipsDetail(updatedList);
    }

    if (shipIdx === 0 && onSyncPrimaryFiles) {
      onSyncPrimaryFiles({
        [fieldNameKey]: fileData,
        [fieldDataKey]: fileData
      });
    }
  };

  const handleRemoveFile = (shipIdx, fileType) => {
    const fieldNameKey = fileType === 'visit' ? 'fileVisitName' : 'fileFotoName';
    const fieldDataKey = fileType === 'visit' ? 'fileVisitData' : 'fileFotoData';

    const targetShip = resolvedShips[shipIdx];
    const fileUrl = targetShip?.[fieldDataKey] || targetShip?.[fieldNameKey] || '';
    if (isGoogleDriveUrl(fileUrl)) {
      deleteFromGoogleDrive(fileUrl).then((res) => {
        if (res?.success) {
          toast.success('Lampiran dihapus dari Google Drive');
        }
      }).catch(() => {});
    }

    let updatedList = [...resolvedShips];
    if (updatedList[shipIdx]) {
      updatedList[shipIdx] = {
        ...updatedList[shipIdx],
        [fieldNameKey]: '',
        [fieldDataKey]: '',
        [`${fieldNameKey}_orig`]: ''
      };
    }

    if (onChangeShipsDetail) {
      onChangeShipsDetail(updatedList);
    }

    if (shipIdx === 0 && onSyncPrimaryFiles) {
      onSyncPrimaryFiles({
        [fieldNameKey]: '',
        [fieldDataKey]: ''
      });
    }

    toast.info(`Lampiran dihapus.`);
  };

  return (
    <div
      style={{
        background: 'var(--bg-main, #f8fafc)',
        border: '1.5px solid var(--border-color-strong, #cbd5e1)',
        borderRadius: 'var(--radius-md, 8px)',
        padding: '1.25rem',
        marginBottom: '1.25rem'
      }}
    >
      {/* Main Section Header */}
      <div
        style={{
          fontWeight: 800,
          fontSize: '0.9rem',
          color: 'var(--accent-primary, #0284c7)',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          paddingBottom: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <FileCheck2 size={17} />
          <span>UPLOAD BUKTI VISIT & FOTO SELFIE PER KAPAL (FORMAT PDF, MAKS. 3 MB)</span>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            background: 'rgba(2, 132, 199, 0.1)',
            color: '#0284c7',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontWeight: 700
          }}
        >
          {resolvedShips.length} Kapal Terdaftar
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {resolvedShips.map((ship, idx) => {
          const shipName = (ship.namaKapal || `Kapal #${idx + 1}`).toUpperCase();
          const agendaNum = ship.noAgenda || '-';
          const visitFile = ship.fileVisitData || ship.fileVisitName;
          const fotoFile = ship.fileFotoData || ship.fileFotoName;
          const isUploadingVisit = uploadingState[`${idx}_visit`];
          const isUploadingFoto = uploadingState[`${idx}_foto`];

          return (
            <div
              key={`ship-upload-${idx}-${shipName}`}
              style={{
                background: 'var(--bg-card, #ffffff)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0.9rem 1.1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              {/* Ship Title / Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                  paddingBottom: '0.45rem',
                  borderBottom: '1px dashed var(--border-color, #e2e8f0)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      background: 'var(--accent-primary, #0284c7)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px'
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <Anchor size={15} color="var(--accent-primary, #0284c7)" />
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary, #0f172a)' }}>
                    {shipName}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                  Agenda: <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{agendaNum}</strong>
                </div>
              </div>

              {/* 2-Column Upload Row: Bukti Visit & Foto Selfie */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* 1. Form Bukti Visit (PDF) */}
                <div
                  style={{
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '6px',
                    padding: '0.75rem'
                  }}
                >
                  <label
                    className="form-label"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.45rem',
                      color: 'var(--text-primary, #0f172a)'
                    }}
                  >
                    <FileText size={14} color="#0284c7" />
                    <span>1. Bukti Form Visit (PDF)</span>
                  </label>

                  {visitFile ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '4px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: '#047857',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Form Visit Terlampir (PDF)</span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.7rem',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (onPreview) {
                              onPreview({
                                title: `Bukti Form Visit - ${shipName}`,
                                fileData: visitFile,
                                fileName: `Form_Visit_${shipName}.pdf`
                              });
                            } else if (visitFile.startsWith('http') || visitFile.startsWith('data:')) {
                              window.open(visitFile, '_blank');
                            }
                          }}
                        >
                          <Eye size={12} />
                          <span>Cek</span>
                        </button>

                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx, 'visit')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                            title="Hapus file visit"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : disabled ? (
                    <div
                      style={{
                        padding: '0.45rem 0.65rem',
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        textAlign: 'center'
                      }}
                    >
                      Belum ada lampiran form visit
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => handleFileUpload(e, idx, 'visit')}
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.3rem', width: '100%' }}
                        disabled={isUploadingVisit}
                      />
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted, #64748b)',
                          marginTop: '0.25rem'
                        }}
                      >
                        {isUploadingVisit ? 'Mengunggah file PDF...' : 'Format PDF (Maksimal 3 MB)'}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Foto Selfie Lapangan (PDF) */}
                <div
                  style={{
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '6px',
                    padding: '0.75rem'
                  }}
                >
                  <label
                    className="form-label"
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      marginBottom: '0.45rem',
                      color: 'var(--text-primary, #0f172a)'
                    }}
                  >
                    <Camera size={14} color="#7c3aed" />
                    <span>2. Foto Selfie Lapangan (PDF)</span>
                  </label>

                  {fotoFile ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '4px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: '#047857',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <CheckCircle2 size={13} color="#059669" />
                        <span>Foto Selfie Terlampir (PDF)</span>
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '0.15rem 0.45rem',
                            fontSize: '0.7rem',
                            background: '#7c3aed',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (onPreview) {
                              onPreview({
                                title: `Foto Selfie Lapangan - ${shipName}`,
                                fileData: fotoFile,
                                fileName: `Foto_Selfie_${shipName}.pdf`
                              });
                            } else if (fotoFile.startsWith('http') || fotoFile.startsWith('data:')) {
                              window.open(fotoFile, '_blank');
                            }
                          }}
                        >
                          <Eye size={12} />
                          <span>Cek</span>
                        </button>

                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx, 'foto')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                            title="Hapus foto selfie"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : disabled ? (
                    <div
                      style={{
                        padding: '0.45rem 0.65rem',
                        background: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        textAlign: 'center'
                      }}
                    >
                      Belum ada lampiran foto selfie
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*"
                        onChange={(e) => handleFileUpload(e, idx, 'foto')}
                        className="form-input"
                        style={{ fontSize: '0.75rem', padding: '0.3rem', width: '100%' }}
                        disabled={isUploadingFoto}
                      />
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-muted, #64748b)',
                          marginTop: '0.25rem'
                        }}
                      >
                        {isUploadingFoto ? 'Mengunggah file...' : 'Format PDF / Foto (Maksimal 3 MB)'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
