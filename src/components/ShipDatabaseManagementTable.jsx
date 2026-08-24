import React, { useState, useMemo } from 'react';
import { Ship, Plus, Search, Pencil, Trash2, X, Check, Anchor, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { DEFAULT_SURVEY_TYPES } from './MultiSurveySelect';

const EMPTY_FORM = { namaKapal: '', noAgenda: '', jenisSurvey: '' };

const ShipFormModal = ({ isOpen, onClose, onSave, initialData = EMPTY_FORM, isEdit = false }) => {
  const [form, setForm] = useState(initialData);

  React.useEffect(() => {
    setForm(initialData);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.namaKapal.trim()) {
      toast.error('Nama Kapal tidak boleh kosong');
      return;
    }
    onSave(form);
    onClose();
  };

  const handleSelectQuickSurvey = (surveyType) => {
    setForm(prev => {
      const current = prev.jenisSurvey ? prev.jenisSurvey.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (current.includes(surveyType)) {
        return { ...prev, jenisSurvey: current.filter(s => s !== surveyType).join(', ') };
      } else {
        return { ...prev, jenisSurvey: [...current, surveyType].join(', ') };
      }
    });
  };

  return (
    <ModalPortal>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-card,#fff)', borderRadius: '14px',
            border: '1px solid var(--border-color,#e2e8f0)',
            width: '100%', maxWidth: '480px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color,#e2e8f0)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Anchor size={18} color="#38bdf8" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                {isEdit ? 'Edit Data Kapal' : 'Tambah Kapal Baru'}
              </span>
            </div>
            <button type="button" onClick={onClose}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#94a3b8', borderRadius: '6px' }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Nama Kapal <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: KM DHARMA FERRY"
                value={form.namaKapal}
                onChange={(e) => setForm((p) => ({ ...p, namaKapal: e.target.value.toUpperCase() }))}
                autoFocus
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>No. Agenda</label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: 01001PK26"
                value={form.noAgenda}
                onChange={(e) => setForm((p) => ({ ...p, noAgenda: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Jenis Survei</label>
              <input
                className="form-input"
                type="text"
                placeholder="Contoh: PEMBAHARUAN, PENGEDOKAN, TAHUNAN"
                value={form.jenisSurvey}
                onChange={(e) => setForm((p) => ({ ...p, jenisSurvey: e.target.value.toUpperCase() }))}
                style={{ textTransform: 'uppercase', marginBottom: '0.4rem' }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                Pilihan Cepat Jenis Survei:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '100px', overflowY: 'auto' }}>
                {DEFAULT_SURVEY_TYPES.map((type) => {
                  const isSelected = form.jenisSurvey && form.jenisSurvey.toUpperCase().includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectQuickSurvey(type)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.68rem',
                        borderRadius: '5px',
                        border: isSelected ? '1px solid #0284c7' : '1px solid var(--border-color, #e2e8f0)',
                        background: isSelected ? 'rgba(2,132,199,0.15)' : 'var(--bg-main, #f8fafc)',
                        color: isSelected ? '#0284c7' : 'var(--text-secondary, #64748b)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isSelected && '✓ '} {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary" style={{ minWidth: '90px' }}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" style={{ minWidth: '120px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={15} />
                {isEdit ? 'Simpan Perubahan' : 'Tambah Kapal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export const ShipDatabaseManagementTable = () => {
  const { masterKapal, addMasterKapal, updateMasterKapal, deleteMasterKapal } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return masterKapal;
    return masterKapal.filter(
      (k) =>
        k.namaKapal.toLowerCase().includes(q) ||
        (k.noAgenda || '').toLowerCase().includes(q) ||
        (k.jenisSurvey || '').toLowerCase().includes(q)
    );
  }, [masterKapal, searchTerm]);

  const handleAdd = (data) => {
    addMasterKapal(data);
    toast.success(`Kapal "${data.namaKapal.toUpperCase()}" berhasil ditambahkan ke database`);
  };

  const handleEdit = (data) => {
    updateMasterKapal(editingKapal.id, data);
    toast.success('Data kapal berhasil diperbarui');
    setEditingKapal(null);
  };

  const handleDelete = (id) => {
    const kapal = masterKapal.find((k) => k.id === id);
    deleteMasterKapal(id);
    toast.success(`Kapal "${kapal?.namaKapal}" dihapus dari database`);
    setConfirmDeleteId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 70%, #0c4a6e 100%)',
          border: 'none', padding: '1.5rem 1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 46, height: 46, borderRadius: '12px',
            background: 'rgba(56,189,248,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Ship size={24} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>Database Kapal</h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
              {masterKapal.length} kapal terdaftar dalam sistem BKI Pontianak
            </p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingKapal(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, borderRadius: '10px', padding: '0.6rem 1.25rem' }}
        >
          <Plus size={16} />
          Tambah Kapal
        </button>
      </div>

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Search Bar */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color,#e2e8f0)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'var(--bg-main,#f8fafc)'
        }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted,#94a3b8)' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Cari nama kapal, no. agenda, atau jenis survei..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.1rem', height: '36px', fontSize: '0.85rem' }}
            />
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {filtered.length} kapal ditemukan
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>No.</th>
                <th>Nama Kapal</th>
                <th style={{ width: '160px' }}>No. Agenda</th>
                <th style={{ minWidth: '200px' }}>Jenis Survei</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Anchor size={36} color="#cbd5e1" />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {searchTerm ? 'Tidak ada kapal yang cocok' : 'Belum ada kapal terdaftar'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                          {searchTerm ? 'Coba kata kunci lain' : 'Klik "Tambah Kapal" untuk menambah kapal baru'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((kapal, idx) => (
                  <tr key={kapal.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '8px',
                          background: 'rgba(2,132,199,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Ship size={15} color="#0284c7" />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {kapal.namaKapal}
                        </span>
                      </div>
                    </td>
                    <td>
                      {kapal.noAgenda ? (
                        <span style={{
                          background: 'rgba(5,150,105,0.1)', color: '#059669',
                          borderRadius: '6px', padding: '0.2rem 0.65rem',
                          fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace'
                        }}>
                          {kapal.noAgenda}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td>
                      {kapal.jenisSurvey ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {kapal.jenisSurvey.split(',').map((s, i) => (
                            <span
                              key={i}
                              style={{
                                background: 'rgba(56, 189, 248, 0.12)',
                                color: '#0284c7',
                                border: '1px solid rgba(2, 132, 199, 0.25)',
                                borderRadius: '5px',
                                padding: '0.15rem 0.5rem',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {confirmDeleteId === kapal.id ? (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>Hapus?</span>
                          <button type="button" onClick={() => handleDelete(kapal.id)}
                            style={{ padding: '0.2rem 0.5rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                            Ya
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)}
                            style={{ padding: '0.2rem 0.5rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}>
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button type="button"
                            onClick={() => { setEditingKapal(kapal); setShowModal(true); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                              background: 'rgba(2,132,199,0.1)', color: '#0284c7',
                              border: '1px solid rgba(2,132,199,0.25)', borderRadius: '7px', cursor: 'pointer'
                            }}
                            title="Edit kapal"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button type="button"
                            onClick={() => setConfirmDeleteId(kapal.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                              background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', cursor: 'pointer'
                            }}
                            title="Hapus kapal"
                          >
                            <Trash2 size={12} /> Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {masterKapal.length > 0 && (
          <div style={{
            padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-color,#e2e8f0)',
            background: 'var(--bg-main,#f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total: <strong>{masterKapal.length}</strong> kapal
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Data tersinkronisasi dengan Supabase Cloud
            </span>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <ShipFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingKapal(null); }}
        onSave={editingKapal ? handleEdit : handleAdd}
        initialData={editingKapal || EMPTY_FORM}
        isEdit={!!editingKapal}
      />
    </div>
  );
};

