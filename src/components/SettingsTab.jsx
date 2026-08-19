import React, { useState } from 'react';
import { KeyRound, Check, Shield, Eye, EyeOff, RotateCcw, User, FileCheck2, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ConfirmModal } from './ConfirmModal';
import { validatePasswordStrength } from '../utils/security';

export const SettingsTab = () => {
  const { currentUser, changePassword, verifyCurrentPassword, resetUsers, updateUser, usersList } = useAuth();
  const { adminSettings, updateAdminSettings } = useData();

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
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [isUploadingKacabTtd, setIsUploadingKacabTtd] = useState(false);
  const [isUploadingPembuatTtd, setIsUploadingPembuatTtd] = useState(false);

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
    const fileExt = file.name.split('.').pop();
    const fileName = `kacab_${Date.now()}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
      setSignatoryInput((prev) => ({
        ...prev,
        kacabSignatureUrl: publicUrlData.publicUrl
      }));
    } catch (err) {
      console.error('Upload failed, falling back to base64:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatoryInput((prev) => ({
          ...prev,
          kacabSignatureUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingKacabTtd(false);
    }
  };

  const handlePembuatSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPembuatTtd(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `pembuat_${Date.now()}.${fileExt}`;
    const filePath = `signatures/${fileName}`;

    try {
      if (!supabase) throw new Error('Supabase not configured');
      const { data, error } = await supabase.storage.from('lampiran').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('lampiran').getPublicUrl(filePath);
      setSignatoryInput((prev) => ({
        ...prev,
        pembuatSignatureUrl: publicUrlData.publicUrl
      }));
    } catch (err) {
      console.error('Upload failed, falling back to base64:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatoryInput((prev) => ({
          ...prev,
          pembuatSignatureUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingPembuatTtd(false);
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

  const handleConfirmResetDemo = () => {
    resetUsers();
    setIsResetConfirmOpen(false);
    alert('Seluruh data demo dan akun pengguna telah berhasil dikembalikan ke status awal.');
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
                {signatoryInput.kacabSignatureUrl ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <img
                        src={signatoryInput.kacabSignatureUrl}
                        alt="TTD Kacab"
                        style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSignatoryInput({ ...signatoryInput, kacabSignatureUrl: '' })}
                      style={{ color: '#dc2626', width: '100%' }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus TTD</span>
                    </button>
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
                {signatoryInput.pembuatSignatureUrl ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                      <img
                        src={signatoryInput.pembuatSignatureUrl}
                        alt="TTD Pembuat"
                        style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSignatoryInput({ ...signatoryInput, pembuatSignatureUrl: '' })}
                      style={{ color: '#dc2626', width: '100%' }}
                    >
                      <Trash2 size={13} />
                      <span>Hapus TTD</span>
                    </button>
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

      {/* Admin Maintenance Box */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <Shield size={22} color="#dc2626" />
              <div>
                <h3 className="card-title" style={{ color: '#dc2626' }}>Pemeliharaan Sistem & Reset Data Demo</h3>
                <div className="card-subtitle">Kembalikan seluruh akun pengguna dan data ke status awal</div>
              </div>
            </div>
          </div>

          <button className="btn btn-danger" onClick={() => setIsResetConfirmOpen(true)}>
            <RotateCcw size={16} />
            <span>Reset Seluruh Data & Akun Demo</span>
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetDemo}
        title="Konfirmasi Reset Data Demo"
        message="Apakah Anda yakin ingin mengembalikan seluruh akun pengguna, password, dan data surat tugas ke kondisi default bawaan sistem?"
        confirmText="Ya, Reset Semua Data"
        type="danger"
      />
    </div>
  );
};
