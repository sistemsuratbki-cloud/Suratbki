import React, { useState, useMemo, useEffect } from 'react';
import {
  Ship, Plus, Search, Pencil, Trash2, X, Check, Anchor, Building2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers,
  Filter, RotateCcw, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { ModalPortal } from './ModalPortal';
import { DEFAULT_SURVEY_TYPES } from './MultiSurveySelect';
import { MASTER_COMPANIES } from '../data/defaultMasterKapal';

const EMPTY_FORM = { namaKapal: '', noAgenda: '', pemohon: '', jenisSurvey: '' };
const ALPHABET = ['ALL', '0-9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

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
    const result = onSave(form);
    if (result !== false) {
      onClose();
    }
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
            width: '100%', maxWidth: '520px',
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
                style={{ textTransform: 'uppercase', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700 }}>No. Agenda</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: 00002PK26"
                  value={form.noAgenda}
                  onChange={(e) => setForm((p) => ({ ...p, noAgenda: e.target.value }))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Building2 size={14} color="var(--accent-primary)" />
                  <span>Perusahaan (Pemohon)</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  list="master-companies-autocomplete-list"
                  placeholder="Contoh: PT. PELAYARAN ARI DUTA BAHARI"
                  value={form.pemohon || ''}
                  onChange={(e) => setForm((p) => ({ ...p, pemohon: e.target.value.toUpperCase() }))}
                  style={{ textTransform: 'uppercase' }}
                />
                <datalist id="master-companies-autocomplete-list">
                  {MASTER_COMPANIES.map((comp, idx) => (
                    <option key={idx} value={comp} />
                  ))}
                </datalist>
              </div>
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

  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('nama_asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [jumpPageInput, setJumpPageInput] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingKapal, setEditingKapal] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Total unique companies
  const uniqueCompanies = useMemo(() => {
    const set = new Set();
    masterKapal.forEach((k) => {
      if (k.pemohon && k.pemohon.trim()) set.add(k.pemohon.trim());
    });
    return set.size;
  }, [masterKapal]);

  // List of unique companies for filter dropdown
  const companiesList = useMemo(() => {
    const set = new Set();
    masterKapal.forEach((k) => {
      if (k.pemohon && k.pemohon.trim()) set.add(k.pemohon.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [masterKapal]);

  // Letter count mapping for badge indicator
  const letterCounts = useMemo(() => {
    const counts = {};
    masterKapal.forEach((k) => {
      const ch = (k.namaKapal || '').trim().charAt(0).toUpperCase();
      if (/[0-9]/.test(ch)) {
        counts['0-9'] = (counts['0-9'] || 0) + 1;
      } else if (/[A-Z]/.test(ch)) {
        counts[ch] = (counts[ch] || 0) + 1;
      }
    });
    return counts;
  }, [masterKapal]);

  // Filtered and Sorted Data
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const list = masterKapal.filter((k) => {
      // 1. Text Search
      if (q) {
        const matches =
          (k.namaKapal || '').toLowerCase().includes(q) ||
          (k.noAgenda || '').toLowerCase().includes(q) ||
          (k.pemohon || '').toLowerCase().includes(q) ||
          (k.jenisSurvey || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Letter Filter
      if (selectedLetter !== 'ALL') {
        const firstChar = (k.namaKapal || '').trim().charAt(0).toUpperCase();
        if (selectedLetter === '0-9') {
          if (!/[0-9]/.test(firstChar)) return false;
        } else {
          if (firstChar !== selectedLetter) return false;
        }
      }

      // 3. Company Filter
      if (companyFilter !== 'ALL') {
        if ((k.pemohon || '').trim().toUpperCase() !== companyFilter.toUpperCase()) {
          return false;
        }
      }

      return true;
    });

    // 4. Sort
    list.sort((a, b) => {
      if (sortBy === 'nama_asc') return (a.namaKapal || '').localeCompare(b.namaKapal || '');
      if (sortBy === 'nama_desc') return (b.namaKapal || '').localeCompare(a.namaKapal || '');
      if (sortBy === 'agenda_asc') return (a.noAgenda || '').localeCompare(b.noAgenda || '');
      if (sortBy === 'agenda_desc') return (b.noAgenda || '').localeCompare(a.noAgenda || '');
      if (sortBy === 'pemohon_asc') return (a.pemohon || '').localeCompare(b.pemohon || '');
      return 0;
    });

    return list;
  }, [masterKapal, searchTerm, selectedLetter, companyFilter, sortBy]);

  // Total pages calculation
  const effectiveRowsPerPage = Number(rowsPerPage) || (filtered.length || 1);
  const totalPages = rowsPerPage === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / effectiveRowsPerPage));

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLetter, companyFilter, rowsPerPage]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    if (rowsPerPage === 0) return filtered;
    const start = (currentPage - 1) * effectiveRowsPerPage;
    return filtered.slice(start, start + effectiveRowsPerPage);
  }, [filtered, currentPage, effectiveRowsPerPage, rowsPerPage]);

  const startIndex = (currentPage - 1) * effectiveRowsPerPage;
  const endIndex = rowsPerPage === 0 ? filtered.length : Math.min(filtered.length, startIndex + effectiveRowsPerPage);

  // Smart page numbers array for pagination bar
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [totalPages, currentPage]);

  const handleJumpPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpPageInput('');
    } else {
      toast.error(`Masukkan nomor halaman antara 1 dan ${totalPages}`);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedLetter('ALL');
    setCompanyFilter('ALL');
    setSortBy('nama_asc');
    setCurrentPage(1);
  };

  const handleAdd = (data) => {
    const result = addMasterKapal(data);
    if (result && !result.success && result.error === 'duplicate') {
      toast.error(`No. Agenda "${result.noAgenda}" sudah digunakan oleh kapal "${result.existingKapal}". Tidak dapat menyimpan data duplikat.`, { duration: 5000 });
      return false;
    }
    toast.success(`Kapal "${data.namaKapal.toUpperCase()}" berhasil ditambahkan ke database`);
    return true;
  };

  const handleEdit = (data) => {
    const result = updateMasterKapal(editingKapal.id, data);
    if (result && !result.success && result.error === 'duplicate') {
      toast.error(`No. Agenda "${result.noAgenda}" sudah digunakan oleh kapal "${result.existingKapal}". Tidak dapat menyimpan data duplikat.`, { duration: 5000 });
      return false;
    }
    toast.success('Data kapal berhasil diperbarui');
    setEditingKapal(null);
    return true;
  };

  const handleDelete = (id) => {
    const kapal = masterKapal.find((k) => k.id === id);
    deleteMasterKapal(id);
    toast.success(`Kapal "${kapal?.namaKapal}" dihapus dari database`);
    setConfirmDeleteId(null);
  };

  const hasActiveFilters = searchTerm !== '' || selectedLetter !== 'ALL' || companyFilter !== 'ALL' || sortBy !== 'nama_asc';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 70%, #0c4a6e 100%)',
          border: 'none', padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem', borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '10px',
            background: 'rgba(56,189,248,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Ship size={22} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>Database Kapal & Perusahaan</h2>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
              <strong>{masterKapal.length}</strong> kapal terdaftar & <strong>{uniqueCompanies}</strong> perusahaan pemohon
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { setEditingKapal(null); setShowModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, borderRadius: '8px', padding: '0.55rem 1.15rem', fontSize: '0.84rem' }}
        >
          <Plus size={15} />
          Tambah Kapal
        </button>
      </div>

      {/* FAST NAVIGATION: A-Z ALPHABET CHIPS BAR */}
      <div
        style={{
          background: 'var(--bg-card,#fff)',
          border: '1px solid var(--border-color,#e2e8f0)',
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            <Layers size={14} color="var(--accent-primary)" />
            <span>Navigasi Cepat Abjad (A - Z):</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px'
              }}
            >
              <RotateCcw size={11} /> Reset Filter
            </button>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
            scrollbarWidth: 'thin'
          }}
        >
          {ALPHABET.map((letter) => {
            const isSelected = selectedLetter === letter;
            const count = letter === 'ALL' ? masterKapal.length : (letterCounts[letter] || 0);

            return (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter)}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.74rem',
                  fontWeight: isSelected ? 800 : 600,
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color,#e2e8f0)',
                  background: isSelected ? 'var(--accent-primary)' : 'var(--bg-main,#f8fafc)',
                  color: isSelected ? '#ffffff' : (count > 0 ? 'var(--text-primary)' : 'var(--text-muted)'),
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  opacity: count === 0 && letter !== 'ALL' ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title={letter === 'ALL' ? 'Tampilkan Semua Abjad' : `Abjad ${letter} (${count} kapal)`}
              >
                <span>{letter === 'ALL' ? 'Semua' : letter}</span>
                {letter !== 'ALL' && count > 0 && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      padding: '0.05rem 0.3rem',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                      color: isSelected ? '#ffffff' : 'inherit'
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
        {/* COMPACT TOOLBAR: Search, Perusahaan Filter, Sort, & Per Page */}
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border-color,#e2e8f0)',
            background: 'var(--bg-main,#f8fafc)',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.1fr 0.9fr auto',
            gap: '0.65rem',
            alignItems: 'center'
          }}
        >
          {/* 1. Search Box */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Cari kapal, no. agenda, perusahaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2rem', height: '32px', fontSize: '0.8rem', width: '100%' }}
            />
          </div>

          {/* 2. Company / Pemohon Filter */}
          <div>
            <select
              className="form-select"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
            >
              <option value="ALL">🏢 Semua Perusahaan ({uniqueCompanies})</option>
              {companiesList.map((comp, idx) => (
                <option key={idx} value={comp}>
                  🏢 {comp}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sort Order */}
          <div>
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ width: '100%', height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
            >
              <option value="nama_asc">🔤 Nama Kapal (A - Z)</option>
              <option value="nama_desc">🔤 Nama Kapal (Z - A)</option>
              <option value="agenda_asc">📄 No. Agenda (Asc)</option>
              <option value="agenda_desc">📄 No. Agenda (Desc)</option>
              <option value="pemohon_asc">🏢 Perusahaan (A - Z)</option>
            </select>
          </div>

          {/* 4. Rows Per Page Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tampil:</span>
            <select
              className="form-select"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              style={{ height: '32px', fontSize: '0.78rem', padding: '0.2rem 0.4rem', width: '85px' }}
            >
              <option value={15}>15 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
              <option value={250}>250 baris</option>
              <option value={0}>Semua</option>
            </select>
          </div>
        </div>

        {/* Top Info Bar */}
        <div
          style={{
            padding: '0.45rem 1rem',
            background: 'var(--bg-card,#ffffff)',
            borderBottom: '1px solid var(--border-color,#e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)'
          }}
        >
          <div>
            Menampilkan <strong>{filtered.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> dari <strong>{filtered.length}</strong> data kapal
            {selectedLetter !== 'ALL' && <span style={{ marginLeft: '0.35rem', color: 'var(--accent-primary)', fontWeight: 700 }}>(Abjad {selectedLetter})</span>}
          </div>
          {totalPages > 1 && (
            <div style={{ fontWeight: 600 }}>
              Halaman <strong style={{ color: 'var(--accent-primary)' }}>{currentPage}</strong> dari <strong>{totalPages}</strong>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto', minHeight: '320px' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>No.</th>
                <th>Nama Kapal</th>
                <th style={{ width: '150px' }}>No. Agenda</th>
                <th style={{ minWidth: '220px' }}>Perusahaan (Pemohon)</th>
                <th style={{ minWidth: '180px' }}>Jenis Survei</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                      <Anchor size={36} color="#cbd5e1" />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {hasActiveFilters ? 'Tidak ada data kapal yang sesuai filter' : 'Belum ada data kapal'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem' }}>
                          {hasActiveFilters ? 'Klik "Reset Filter" atau pilih abjad lain' : 'Klik "Tambah Kapal" untuk menambahkan data baru'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((kapal, idx) => {
                  const trueIndex = startIndex + idx + 1;
                  return (
                    <tr key={kapal.id}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {trueIndex}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '7px',
                            background: 'rgba(2,132,199,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <Ship size={15} color="#0284c7" />
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                            {kapal.namaKapal}
                          </span>
                        </div>
                      </td>
                      <td>
                        {kapal.noAgenda ? (
                          <span style={{
                            background: 'rgba(5,150,105,0.1)', color: '#059669',
                            borderRadius: '5px', padding: '0.15rem 0.55rem',
                            fontSize: '0.78rem', fontWeight: 700, fontFamily: 'monospace'
                          }}>
                            {kapal.noAgenda}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td>
                        {kapal.pemohon ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Building2 size={13} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                              {kapal.pemohon}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>—</span>
                        )}
                      </td>
                      <td>
                        {kapal.jenisSurvey ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem' }}>
                            {kapal.jenisSurvey.split(',').map((s, i) => (
                              <span
                                key={i}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#0284c7',
                                  border: '1px solid rgba(2, 132, 199, 0.25)',
                                  borderRadius: '4px',
                                  padding: '0.1rem 0.45rem',
                                  fontSize: '0.7rem',
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
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Hapus?</span>
                            <button type="button" onClick={() => handleDelete(kapal.id)}
                              style={{ padding: '0.15rem 0.45rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                              Ya
                            </button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)}
                              style={{ padding: '0.15rem 0.45rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button type="button"
                              onClick={() => { setEditingKapal(kapal); setShowModal(true); }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                                background: 'rgba(2,132,199,0.1)', color: '#0284c7',
                                border: '1px solid rgba(2,132,199,0.25)', borderRadius: '6px', cursor: 'pointer'
                              }}
                              title="Edit kapal"
                            >
                              <Pencil size={11} /> Edit
                            </button>
                            <button type="button"
                              onClick={() => setConfirmDeleteId(kapal.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700,
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer'
                              }}
                              title="Hapus kapal"
                            >
                              <Trash2 size={11} /> Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION CONTROLLER (NO MORE ENDLESS SCROLLING) */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border-color,#e2e8f0)',
              background: 'var(--bg-main,#f8fafc)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}
          >
            {/* Left: Summary Info */}
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Menampilkan data <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> dari total <strong>{filtered.length}</strong> kapal
            </div>

            {/* Middle: Numeric Page Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.25rem 0.45rem',
                  fontSize: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color,#e2e8f0)',
                  background: 'var(--bg-card,#fff)',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.45 : 1
                }}
                title="Halaman Pertama"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color,#e2e8f0)',
                  background: 'var(--bg-card,#fff)',
                  color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              {/* Numeric Page List */}
              {pageNumbers.map((p, i) => {
                if (p === '...') {
                  return (
                    <span key={`ellipsis-${i}`} style={{ padding: '0.2rem 0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      ...
                    </span>
                  );
                }
                const isActive = p === currentPage;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 0.35rem',
                      fontSize: '0.75rem',
                      fontWeight: isActive ? 800 : 600,
                      borderRadius: '5px',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color,#e2e8f0)',
                      background: isActive ? 'var(--accent-primary)' : 'var(--bg-card,#fff)',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p}
                  </button>
                );
              })}

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.25rem 0.55rem',
                  fontSize: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color,#e2e8f0)',
                  background: 'var(--bg-card,#fff)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.45 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
                title="Halaman Berikutnya"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.25rem 0.45rem',
                  fontSize: '0.75rem',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color,#e2e8f0)',
                  background: 'var(--bg-card,#fff)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.45 : 1
                }}
                title="Halaman Terakhir"
              >
                <ChevronsRight size={14} />
              </button>
            </div>

            {/* Right: Quick Jump Form */}
            <form onSubmit={handleJumpPage} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Lompat:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                placeholder={String(currentPage)}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                style={{
                  width: '52px',
                  height: '28px',
                  padding: '0 0.35rem',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color,#e2e8f0)',
                  background: 'var(--bg-card,#fff)'
                }}
              />
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                style={{ height: '28px', padding: '0 0.55rem', fontSize: '0.72rem' }}
              >
                Go
              </button>
            </form>
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
