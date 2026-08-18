import React, { useState } from 'react';
import { KeyRound, Check, Shield, Eye, EyeOff, RotateCcw, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ConfirmModal } from './ConfirmModal';
import { validatePasswordStrength } from '../utils/security';

export const SettingsTab = () => {
  const { currentUser, changePassword, verifyCurrentPassword, resetUsers, updateUser } = useAuth();
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

  const [signatoryInput, setSignatoryInput] = useState({
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    keteranganLain: adminSettings?.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    tembusan: adminSettings?.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026'
  });

  const handleSaveAdminSettings = (e) => {
    e.preventDefault();
    updateAdminSettings(signatoryInput);
    setAdminMsg('Pengaturan Penandatangan Kepala Cabang berhasil disimpan!');
    setTimeout(() => setAdminMsg(''), 4000);
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
    setMessage({ type: 'success', text: 'Seluruh data demo & akun telah direset ke kondisi awal!' });
  };

  const passValidation = validatePasswordStrength(newPassInput);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* User Profile Summary Card */}
      <div className="card-section" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: currentUser?.avatarBg || '#1e3a8a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800
            }}
          >
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentUser?.name}
            </h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 700, marginTop: '0.1rem' }}>
              Username: @{currentUser?.username || currentUser?.role} • {currentUser?.roleLabel}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <div>📧 {currentUser?.email || 'Belum ada email'}</div>
              <div>📱 {currentUser?.phone || 'Belum ada nomor telepon'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <User size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Edit Profil Saya</h3>
              <div className="card-subtitle">Perbarui informasi data diri Anda</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} style={{ maxWidth: '520px' }}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap *</label>
            <input
              type="text"
              className="form-input"
              value={profileInput.name}
              onChange={(e) => setProfileInput({ ...profileInput, name: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-input"
              value={profileInput.email}
              onChange={(e) => setProfileInput({ ...profileInput, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor Telepon (WhatsApp) *</label>
            <input
              type="tel"
              className="form-input"
              value={profileInput.phone}
              onChange={(e) => setProfileInput({ ...profileInput, phone: e.target.value })}
              placeholder="Contoh: 081234567890"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            <Check size={16} />
            Simpan Profil
          </button>
        </form>
      </div>

      {/* Change Password Form */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <KeyRound size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Ubah Password Akun Saya</h3>
              <div className="card-subtitle">Perbarui password akun dengan enkripsi SHA-256 dan standar keamanan tinggi</div>
            </div>
          </div>
        </div>

        {message.text && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: message.type === 'error' ? '#fee2e2' : '#d1fae5',
              color: message.type === 'error' ? '#dc2626' : '#065f46',
              fontWeight: 700,
              fontSize: '0.875rem',
              marginBottom: '1.25rem'
            }}
          >
            {message.type === 'error' ? '⚠️ ' : '✅ '}
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ maxWidth: '520px' }}>
          <div className="form-group" style={{ position: 'relative' }}>
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
                autoComplete="current-password"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Password Baru *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  placeholder="Min 6 Karakter (A-Z, a-z, 0-9)..."
                  required
                  autoComplete="new-password"
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
                type={showNewPass ? 'text' : 'password'}
                className="form-input"
                value={confirmPassInput}
                onChange={(e) => setConfirmPassInput(e.target.value)}
                placeholder="Ulangi password baru..."
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          {/* Real-time Password Strength Meter */}
          {newPassInput && (
            <div style={{ marginBottom: '1rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 700, color: passValidation.color }}>
                <span>Kekuatan Password: {passValidation.label}</span>
                <span>{passValidation.score}/4</span>
              </div>
              <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '0.35rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(passValidation.score / 4) * 100}%`, background: passValidation.color, transition: 'all 0.25s ease' }} />
              </div>
              {passValidation.errors.length > 0 && (
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

      {/* Admin Signatory Settings Box */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <Shield size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Pengaturan Format Cetak Surat Tugas</h3>
              <div className="card-subtitle">Nama Penandatangan, NUP, Keterangan Biaya, dan Tembusan ini akan otomatis digunakan pada seluruh cetakan dokumen</div>
            </div>
          </div>
        </div>

        {adminMsg && (
          <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
            ✅ {adminMsg}
          </div>
        )}

        <form onSubmit={handleSaveAdminSettings} style={{ maxWidth: '560px' }}>
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
            <span>Simpan Pengaturan Cetak</span>
          </button>
        </form>
      </div>

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
