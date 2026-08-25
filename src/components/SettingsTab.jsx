import React, { useState } from 'react';
import {
  KeyRound, Check, Shield, Eye, EyeOff, RotateCcw, User, FileCheck2, Upload, Trash2,
  Database, HardDrive, Zap, Loader2, CheckCircle2, AlertCircle, HelpCircle, Copy, CheckCheck, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ConfirmModal } from './ConfirmModal';
import { validatePasswordStrength } from '../utils/security';
import { fileToSignatureDataUrl, isValidSignature } from '../utils/signatureHelper';
import {
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  testGoogleDriveConnection
} from '../utils/googleDriveService';
import { toast } from 'react-hot-toast';

const GDRIVE_SCRIPT_CODE = `function doGet(e) {
  return handleResponse({
    success: true,
    message: "Google Drive API BKI Pontianak aktif!",
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return handleResponse({ success: false, message: "Payload kosong" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "uploadFile";

    if (action === "ping") {
      return handleResponse({
        success: true,
        message: "Koneksi ke Google Drive sukses!",
        userEmail: Session.getActiveUser().getEmail() || "Google Drive Account"
      });
    }

    if (action === "uploadFile") {
      var rootFolderName = payload.rootFolder || "BKI_DOKUMEN_SURAT";
      var year = payload.year || new Date().getFullYear().toString();
      var month = payload.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM-MMMM");
      var subFolder = payload.subFolder || "UMUM";
      var category = payload.category || "Dokumen";
      
      var fileName = payload.fileName || ("file_" + Date.now());
      var mimeType = payload.mimeType || "application/octet-stream";
      var base64Data = payload.base64Data || "";

      if (base64Data.indexOf(",") > -1) {
        base64Data = base64Data.split(",")[1];
      }

      var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);
      var targetFolder = getOrCreateFolderPath([rootFolderName, year, month, subFolder, category]);
      var createdFile = targetFolder.createFile(decodedBlob);
      
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errSharing) {}

      var fileId = createdFile.getId();
      var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
      var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
      var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
      var thumbnailUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=s800";

      return handleResponse({
        success: true,
        fileId: fileId,
        fileName: createdFile.getName(),
        url: viewUrl,
        viewUrl: viewUrl,
        downloadUrl: downloadUrl,
        directUrl: directUrl,
        thumbnailUrl: thumbnailUrl,
        folderUrl: targetFolder.getUrl(),
        size: createdFile.getSize(),
        mimeType: createdFile.getMimeType(),
        storageProvider: "gdrive",
        uploadedAt: new Date().toISOString()
      });
    }

    return handleResponse({ success: false, message: "Aksi tidak dikenal" }, 400);
  } catch (error) {
    return handleResponse({ success: false, message: error.toString() }, 500);
  }
}

function getOrCreateFolderPath(folderNames) {
  var currentFolder = DriveApp.getRootFolder();
  for (var i = 0; i < folderNames.length; i++) {
    var name = String(folderNames[i]).trim();
    if (!name) continue;
    name = name.replace(/[/\\\\?%*:|"<>]/g, "_");
    var subFolders = currentFolder.getFoldersByName(name);
    if (subFolders.hasNext()) {
      currentFolder = subFolders.next();
    } else {
      currentFolder = currentFolder.createFolder(name);
    }
  }
  return currentFolder;
}

function handleResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const SettingsTab = () => {
  const { currentUser, changePassword, verifyCurrentPassword, updateUser, usersList } = useAuth();
  const { adminSettings, updateAdminSettings, resetData, clearAllDataKeepSettings } = useData();

  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  const [profileInput, setProfileInput] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || ''
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [adminMsg, setAdminMsg] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [isUploadingKacabTtd, setIsUploadingKacabTtd] = useState(false);
  const [isUploadingPembuatTtd, setIsUploadingPembuatTtd] = useState(false);

  // Google Drive State
  const [gdriveConfig, setGdriveConfig] = useState(() => getGoogleDriveConfig());
  const [isTestingGDrive, setIsTestingGDrive] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState(null);
  const [showGDriveGuide, setShowGDriveGuide] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);

  const handleTestGDriveConnection = async () => {
    if (!gdriveConfig.webAppUrl) {
      toast.error('Masukkan Web App URL terlebih dahulu');
      return;
    }

    setIsTestingGDrive(true);
    setGdriveTestResult(null);

    try {
      const result = await testGoogleDriveConnection(gdriveConfig.webAppUrl);
      setGdriveTestResult({
        success: true,
        message: result.message,
        latencyMs: result.latencyMs
      });
      toast.success('Koneksi Google Drive Berhasil!');
    } catch (err) {
      setGdriveTestResult({
        success: false,
        message: err.message
      });
      toast.error(err.message || 'Gagal terhubung ke Google Drive');
    } finally {
      setIsTestingGDrive(false);
    }
  };

  const handleSaveGDriveConfig = () => {
    saveGoogleDriveConfig(gdriveConfig);
    toast.success('Pengaturan Google Drive berhasil disimpan!');
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GDRIVE_SCRIPT_CODE);
    setIsCopiedScript(true);
    toast.success('Kode Google Apps Script berhasil disalin!');
    setTimeout(() => setIsCopiedScript(false), 3000);
  };

  const [signatoryInput, setSignatoryInput] = useState({
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    pembuatDaftar: adminSettings?.pembuatDaftar || 'RENZA MUHARAM',
    nupPembuatDaftar: adminSettings?.nupPembuatDaftar || '50382-KI',
    keteranganLain: adminSettings?.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    tembusan: adminSettings?.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026',
    kacabSignatureUrl: adminSettings?.kacabSignatureUrl || '',
    pembuatSignatureUrl: adminSettings?.pembuatSignatureUrl || ''
  });

  const handleSaveAdminSettings = (e) => {
    e.preventDefault();
    updateAdminSettings(signatoryInput);
    setAdminMsg('Pengaturan Penandatangan dan TTD Digital berhasil disimpan!');
    setTimeout(() => setAdminMsg(''), 4000);
  };

  const handleKacabSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingKacabTtd(true);
    try {
      const dataUrl = await fileToSignatureDataUrl(file);
      setSignatoryInput((prev) => ({
        ...prev,
        kacabSignatureUrl: dataUrl
      }));
      toast.success('TTD Kepala Cabang berhasil diunggah!');

      // Attempt background cloud upload if Supabase is connected
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `kacab_${Date.now()}.${fileExt}`;
        const filePath = `signatures/${fileName}`;
        supabase.storage.from('lampiran').upload(filePath, file).catch(() => {});
      }
    } catch (err) {
      console.error('Upload TTD Kacab failed:', err);
      toast.error('Gagal memproses berkas TTD Kepala Cabang.');
    } finally {
      setIsUploadingKacabTtd(false);
      e.target.value = '';
    }
  };

  const handlePembuatSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPembuatTtd(true);
    try {
      const dataUrl = await fileToSignatureDataUrl(file);
      setSignatoryInput((prev) => ({
        ...prev,
        pembuatSignatureUrl: dataUrl
      }));
      toast.success('TTD Pembuat Daftar berhasil diunggah!');

      // Attempt background cloud upload if Supabase is connected
      if (supabase) {
        const fileExt = file.name.split('.').pop();
        const fileName = `pembuat_${Date.now()}.${fileExt}`;
        const filePath = `signatures/${fileName}`;
        supabase.storage.from('lampiran').upload(filePath, file).catch(() => {});
      }
    } catch (err) {
      console.error('Upload TTD Pembuat failed:', err);
      toast.error('Gagal memproses berkas TTD Pembuat Daftar.');
    } finally {
      setIsUploadingPembuatTtd(false);
      e.target.value = '';
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateUser(currentUser.id, profileInput);
      setMessage({ type: 'success', text: 'Profil Anda berhasil diperbarui!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memperbarui profil.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassInput) {
      setMessage({ type: 'error', text: 'Masukkan password saat ini!' });
      return;
    }

    setIsSubmittingPass(true);

    try {
      const isCurrentValid = await verifyCurrentPassword(currentPassInput);
      if (!isCurrentValid) {
        setMessage({ type: 'error', text: 'Password saat ini yang Anda masukkan salah!' });
        setIsSubmittingPass(false);
        return;
      }

      const strength = validatePasswordStrength(newPassInput);
      if (!strength.isValid) {
        setMessage({
          type: 'error',
          text: `Password baru tidak memenuhi syarat keamanan: ${strength.errors.join(', ')}`
        });
        setIsSubmittingPass(false);
        return;
      }

      if (newPassInput !== confirmPassInput) {
        setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
        setIsSubmittingPass(false);
        return;
      }

      await changePassword(currentUser.id, newPassInput);
      setMessage({ type: 'success', text: 'Password Anda berhasil diperbarui dengan enkripsi aman!' });

      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memperbarui password. Silakan coba lagi.' });
    } finally {
      setIsSubmittingPass(false);
    }
  };

  const handleConfirmResetDemo = async () => {
    try {
      await resetData();
      setIsResetConfirmOpen(false);
      toast.success('Data SPS, PDS, Laporan, dan Kwitansi berhasil direset! (Data Tarif, User, dan Kapal tetap tersimpan)');
    } catch (error) {
      toast.error('Gagal mereset data. Silakan coba lagi.');
      console.error('Reset data error:', error);
    }
  };

  const handleConfirmClearData = async () => {
    try {
      await clearAllDataKeepSettings();
      setIsClearDataConfirmOpen(false);
      toast.success('Semua data berhasil dihapus! Tarif, Grade, dan Pengaturan Admin tetap tersimpan.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Gagal menghapus data. Silakan coba lagi.');
      console.error('Clear data error:', error);
    }
  };

  const passValidation = validatePasswordStrength(newPassInput);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Profile Settings Box */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <User size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Profil Pengguna</h3>
              <div className="card-subtitle">Perbarui informasi nama dan kontak akun Anda</div>
            </div>
          </div>
        </div>

        {message.text && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#dc2626',
              fontWeight: 700,
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ maxWidth: '560px' }}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              className="form-input"
              value={profileInput.name}
              onChange={(e) => setProfileInput({ ...profileInput, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Alamat Email</label>
              <input
                type="email"
                className="form-input"
                value={profileInput.email}
                onChange={(e) => setProfileInput({ ...profileInput, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor Telepon</label>
              <input
                type="text"
                className="form-input"
                value={profileInput.phone}
                onChange={(e) => setProfileInput({ ...profileInput, phone: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
            <Check size={16} />
            <span>Simpan Perubahan Profil</span>
          </button>
        </form>
      </div>

      {/* Password Settings Box */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <KeyRound size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Ganti Password</h3>
              <div className="card-subtitle">Perbarui password akun Anda secara berkala untuk menjaga keamanan sistem</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ maxWidth: '480px' }}>
          <div className="form-group">
            <label className="form-label">Password Saat Ini *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={currentPassInput}
                onChange={(e) => setCurrentPassInput(e.target.value)}
                placeholder="Masukkan password saat ini..."
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
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
              >
                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password Baru *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="Minimal 6 karakter..."
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
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
              >
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru *</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassInput}
              onChange={(e) => setConfirmPassInput(e.target.value)}
              placeholder="Ulangi password baru..."
              required
            />
          </div>

          {newPassInput && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <span>Kekuatan Password:</span>
                <span style={{ color: passValidation.color }}>{passValidation.label}</span>
              </div>
              <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(passValidation.score / 4) * 100}%`, background: passValidation.color, transition: 'all 0.3s' }} />
              </div>
              {!passValidation.isValid && (
                <div style={{ fontSize: '0.725rem', color: '#dc2626', marginTop: '0.35rem' }}>
                  Kekurangan: {passValidation.errors.join(' • ')}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmittingPass}
            style={{ marginTop: '0.5rem', opacity: isSubmittingPass ? 0.6 : 1 }}
          >
            <Check size={16} />
            <span>{isSubmittingPass ? 'Memproses Enkripsi...' : 'Simpan Password Baru'}</span>
          </button>
        </form>
      </div>

      {/* Admin Signatory & Digital Signature Settings Box */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <FileCheck2 size={22} color="var(--accent-primary)" />
              <div>
                <h3 className="card-title">Pengaturan Format Cetak & Tanda Tangan Digital (TTD)</h3>
                <div className="card-subtitle">Upload scan TTD Kepala Cabang dan Pembuat Daftar untuk otomatis disematkan pada dokumen SPS & PDS</div>
              </div>
            </div>
          </div>

          {adminMsg && (
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
              ✅ {adminMsg}
            </div>
          )}

          <form onSubmit={handleSaveAdminSettings} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Kepala Cabang *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.kepalaCabang}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, kepalaCabang: e.target.value })}
                  placeholder="Contoh: MUHSON NURROCHMAT"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NUP Kepala Cabang *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.nup}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, nup: e.target.value })}
                  placeholder="Contoh: 48199-KI"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Pembuat Daftar *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.pembuatDaftar}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, pembuatDaftar: e.target.value })}
                  placeholder="Contoh: RENZA MUHARAM"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NUP Pembuat Daftar *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.nupPembuatDaftar}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, nupPembuatDaftar: e.target.value })}
                  placeholder="Contoh: 50382-KI"
                  required
                />
              </div>
            </div>

            {/* UPLOAD SCAN TTD KEPALA CABANG & PEMBUAT DAFTAR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
              {/* TTD KEPALA CABANG */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                  ✍️ Scan TTD Kepala Cabang
                </label>
                {isValidSignature(signatoryInput.kacabSignatureUrl) ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', position: 'relative' }}>
                      <img
                        src={signatoryInput.kacabSignatureUrl}
                        alt="TTD Kacab"
                        style={{ maxHeight: '54px', maxWidth: '140px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const errBox = document.getElementById('kacab-ttd-err');
                          if (errBox) errBox.style.display = 'block';
                        }}
                      />
                      <span id="kacab-ttd-err" style={{ display: 'none', fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ Gambar rusak / tidak dapat dimuat. Silakan upload ulang.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', textAlign: 'center', margin: 0, fontSize: '0.75rem' }}>
                        <Upload size={13} />
                        <span>{isUploadingKacabTtd ? 'Mengunggah...' : 'Ganti TTD'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleKacabSignatureUpload}
                          disabled={isUploadingKacabTtd}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSignatoryInput({ ...signatoryInput, kacabSignatureUrl: '' })}
                        style={{ color: '#dc2626', fontSize: '0.75rem' }}
                        title="Hapus TTD"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', padding: '0.5rem' }}>
                    <Upload size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      {isUploadingKacabTtd ? 'Mengunggah...' : 'Upload TTD Kacab'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PNG / JPG transparan</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleKacabSignatureUpload}
                      disabled={isUploadingKacabTtd}
                    />
                  </label>
                )}
              </div>

              {/* TTD PEMBUAT DAFTAR */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                  ✍️ Scan TTD Pembuat Daftar
                </label>
                {isValidSignature(signatoryInput.pembuatSignatureUrl) ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', position: 'relative' }}>
                      <img
                        src={signatoryInput.pembuatSignatureUrl}
                        alt="TTD Pembuat"
                        style={{ maxHeight: '54px', maxWidth: '140px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const errBox = document.getElementById('pembuat-ttd-err');
                          if (errBox) errBox.style.display = 'block';
                        }}
                      />
                      <span id="pembuat-ttd-err" style={{ display: 'none', fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ Gambar rusak / tidak dapat dimuat. Silakan upload ulang.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', textAlign: 'center', margin: 0, fontSize: '0.75rem' }}>
                        <Upload size={13} />
                        <span>{isUploadingPembuatTtd ? 'Mengunggah...' : 'Ganti TTD'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handlePembuatSignatureUpload}
                          disabled={isUploadingPembuatTtd}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSignatoryInput({ ...signatoryInput, pembuatSignatureUrl: '' })}
                        style={{ color: '#dc2626', fontSize: '0.75rem' }}
                        title="Hapus TTD"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', padding: '0.5rem' }}>
                    <Upload size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      {isUploadingPembuatTtd ? 'Mengunggah...' : 'Upload TTD Pembuat'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PNG / JPG transparan</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePembuatSignatureUpload}
                      disabled={isUploadingPembuatTtd}
                    />
                  </label>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Keterangan Lain (Pembiayaan) *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={signatoryInput.keteranganLain}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, keteranganLain: e.target.value })}
                  placeholder="Catatan pembiayaan BKI..."
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tembusan *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={signatoryInput.tembusan}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, tembusan: e.target.value })}
                  placeholder="Contoh: 1. Yth. Kepala Divisi keuangan..."
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
              <Check size={16} />
              <span>Simpan Pengaturan Cetak & TTD</span>
            </button>
          </form>
        </div>
      )}

      {/* GOOGLE DRIVE INTEGRATION SETTINGS (DEVELOPER ONLY) */}
      {currentUser?.role === 'developer' && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <HardDrive size={22} color="var(--accent-primary)" />
              <div>
                <h3 className="card-title">Penyimpanan Berkas Google Drive</h3>
                <div className="card-subtitle">
                  Pisahkan berkas foto visit, dokumentasi survei, kwitansi, dan tiket ke folder Google Drive agar hemat database dan mudah dikelola
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  Aktifkan Penyimpanan Google Drive
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {gdriveConfig.enabled
                    ? '🟢 Berkas baru yang diunggah akan otomatis disimpan ke Google Drive'
                    : '⚪ Penyimpanan menggunakan mode standar (Supabase / Local)'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={gdriveConfig.enabled}
                  onChange={(e) => {
                    const newCfg = { ...gdriveConfig, enabled: e.target.checked };
                    setGdriveConfig(newCfg);
                    saveGoogleDriveConfig(newCfg);
                    toast.success(e.target.checked ? 'Google Drive diaktifkan!' : 'Google Drive dinonaktifkan.');
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: gdriveConfig.enabled ? 'var(--accent-primary)' : '#cbd5e1',
                    transition: '.2s',
                    borderRadius: '26px'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '20px',
                      width: '20px',
                      left: gdriveConfig.enabled ? '25px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.2s',
                      borderRadius: '50%'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Config Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Google Apps Script Web App URL *
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={gdriveConfig.webAppUrl}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, webAppUrl: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  URL Web App yang diperoleh setelah menerapkan (*deploy*) script di Google Apps Script.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Nama Folder Utama di Drive
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="BKI_DOKUMEN_SURAT"
                  value={gdriveConfig.rootFolder}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, rootFolder: e.target.value })}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Folder akan dibuat otomatis di Google Drive utama Anda.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestGDriveConnection}
                  disabled={isTestingGDrive || !gdriveConfig.webAppUrl}
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.82rem' }}
                >
                  {isTestingGDrive ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} color="#eab308" />
                      <span>Tes Koneksi Drive</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGDriveConfig}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
                >
                  <Check size={15} />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            {/* Test Result Indicator */}
            {gdriveTestResult && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: gdriveTestResult.success ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${gdriveTestResult.success ? '#a7f3d0' : '#fecaca'}`,
                  color: gdriveTestResult.success ? '#065f46' : '#991b1b'
                }}
              >
                {gdriveTestResult.success ? <CheckCircle2 size={16} color="#059669" /> : <AlertCircle size={16} color="#dc2626" />}
                <div style={{ flex: 1 }}>
                  <strong>{gdriveTestResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</strong> — {gdriveTestResult.message}
                  {gdriveTestResult.latencyMs && (
                    <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '0.4rem' }}>
                      ({gdriveTestResult.latencyMs} ms)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Guide & Script Template Accordion */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: '#f1f5f9'
                }}
                onClick={() => setShowGDriveGuide(!showGDriveGuide)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                  <HelpCircle size={16} color="var(--accent-primary)" />
                  <span>Panduan Cepat Setup Google Apps Script (2 Menit)</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {showGDriveGuide ? 'Tutup Panduan ▲' : 'Buka Panduan ▼'}
                </span>
              </div>

              {showGDriveGuide && (
                <div style={{ padding: '1rem', fontSize: '0.82rem', lineHeight: '1.5', color: '#334155' }}>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 1rem 0' }}>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Buka <strong><a href="https://script.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Google Apps Script (script.google.com)</a></strong> dengan akun Google kantor / pribadi Anda.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik <strong>"New project" (Proyek baru)</strong>, lalu hapus semua kode di editor.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Salin kode di bawah ini lalu tempelkan (*paste*) ke editor Google Apps Script.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik tombol biru <strong>"Deploy"</strong> di pojok kanan atas &gt; <strong>"New deployment"</strong>.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Pilih tipe <strong>"Web app"</strong>:
                      <ul style={{ margin: '0.2rem 0', paddingLeft: '1.2rem' }}>
                        <li><strong>Execute as:</strong> <code>Me (Akun Anda)</code></li>
                        <li><strong>Who has access:</strong> <code>Anyone (Siapa saja)</code></li>
                      </ul>
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik <strong>"Deploy"</strong>, izinkan akses akun, lalu salin <strong>Web app URL</strong> yang dihasilkan dan tempelkan ke kolom URL di atas!
                    </li>
                  </ol>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>
                      Kode Google Apps Script (Code.gs):
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyScriptCode}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {isCopiedScript ? (
                        <>
                          <CheckCheck size={14} color="#059669" />
                          <span style={{ color: '#059669', fontWeight: 600 }}>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Salin Kode Script</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#e2e8f0',
                      padding: '0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      margin: 0
                    }}
                  >
                    {GDRIVE_SCRIPT_CODE}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Developer Maintenance Box */}
      {currentUser?.role === 'developer' && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <Shield size={22} color="#dc2626" />
              <div>
                <h3 className="card-title" style={{ color: '#dc2626' }}>Pemeliharaan Sistem & Reset Data</h3>
                <div className="card-subtitle">Kembalikan seluruh akun pengguna dan data ke status awal (Akses Khusus Developer)</div>
              </div>
            </div>
          </div>

          <button className="btn btn-danger" onClick={() => setIsResetConfirmOpen(true)}>
            <RotateCcw size={16} />
            <span>Reset Seluruh Data</span>
          </button>

          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Database size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e', marginBottom: '0.3rem' }}>
                  Hapus Semua Data (Simpan Tarif & Settings)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: '1.4' }}>
                  Menghapus semua Surat Tugas, Laporan, dan Kwitansi. Data Tarif, Grade, dan Pengaturan Admin TIDAK AKAN TERHAPUS.
                </div>
              </div>
            </div>
            <button 
              className="btn btn-warning" 
              onClick={() => setIsClearDataConfirmOpen(true)}
              style={{ width: '100%', background: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' }}
            >
              <Trash2 size={16} />
              <span>Hapus Data (Simpan Tarif & Settings)</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetDemo}
        title="Konfirmasi Reset Data"
        message="Tindakan ini akan menghapus semua data Surat Tugas (SPS & PDS), Laporan BKI, Kwitansi, dan Lampiran dari sistem lokal & Cloud Supabase. Data Manajemen Tarif, Manajemen User, dan Database Kapal TIDAK AKAN DIHAPUS. Masukkan password developer Anda untuk melanjutkan."
        confirmText="Ya, Reset Semua Data"
        type="danger"
        requirePassword={true}
      />

      <ConfirmModal
        isOpen={isClearDataConfirmOpen}
        onClose={() => setIsClearDataConfirmOpen(false)}
        onConfirm={handleConfirmClearData}
        title="Konfirmasi Hapus Semua Data"
        message="Tindakan ini akan menghapus SEMUA Surat Tugas, Laporan Survei, dan Kwitansi dari sistem. Data Tarif, Grade Tariff, dan Pengaturan Admin TIDAK AKAN TERHAPUS. Apakah Anda yakin?"
        confirmText="Ya, Hapus Semua Data"
        type="danger"
        requirePassword={false}
      />
    </div>
  );
};
