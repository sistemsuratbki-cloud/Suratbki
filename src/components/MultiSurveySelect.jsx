import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { Check, ChevronDown, X, Plus, Search, Tag, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { DataContext } from '../context/DataContext';

export const STORAGE_KEY = 'st_custom_survey_types';

export const DEFAULT_SURVEY_TYPES = [
  'PEMBAHARUAN',
  'TAHUNAN',
  'ANTARA',
  'PERPANJANGAN',
  'PENGEDOKAN',
  'UWILD',
  'TUNDA DOK',
  'POROS CABUT/TUNDA/DITEMPAT (PER POROS)',
  'KHUSUS (PER JAM)***',
  'PEMBARUAN LL',
  'TAHUNAN LL',
  'REVALIDASI LL',
  'CONVEYANCE SURVEY'
];

// Baca custom types dari localStorage & cache adminSettings
export function loadCustomTypes() {
  try {
    const list = [];
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => {
          if (t && typeof t === 'string') list.push(t.trim().toUpperCase());
        });
      }
    }

    // Periksa juga st_admin_settings jika ada customSurveyTypes
    try {
      const adminRaw = localStorage.getItem('st_admin_settings');
      if (adminRaw) {
        const adminObj = JSON.parse(adminRaw);
        if (Array.isArray(adminObj?.customSurveyTypes)) {
          adminObj.customSurveyTypes.forEach((t) => {
            if (t && typeof t === 'string') list.push(t.trim().toUpperCase());
          });
        }
      }
    } catch {}

    const defaultSet = new Set(DEFAULT_SURVEY_TYPES.map((d) => d.toUpperCase()));
    return Array.from(new Set(list.filter((t) => t && !defaultSet.has(t))));
  } catch {
    return [];
  }
}

// Simpan custom types ke localStorage
export function saveCustomTypes(types) {
  try {
    const defaultSet = new Set(DEFAULT_SURVEY_TYPES.map((d) => d.toUpperCase()));
    const unique = Array.from(
      new Set(
        (Array.isArray(types) ? types : [])
          .map((t) => (typeof t === 'string' ? t.trim().toUpperCase() : ''))
          .filter((t) => t && !defaultSet.has(t))
      )
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
    return unique;
  } catch {
    return types;
  }
}

export default function MultiSurveySelect({
  value = '',
  onChange,
  placeholder = '-- PILIH JENIS SURVEY (BISA LEBIH DARI 1) --',
  required = false,
  disabled = false
}) {
  const dataContext = useContext(DataContext);
  const adminSettings = dataContext?.adminSettings;
  const updateAdminSettings = dataContext?.updateAdminSettings;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [customSavedTypes, setCustomSavedTypes] = useState(() => loadCustomTypes());

  const containerRef = useRef(null);
  const customInputRef = useRef(customInput);
  const commitCustomInputRef = useRef(null);
  const selectedSurveysRef = useRef([]);

  // Selalu perbarui ref customInput
  useEffect(() => {
    customInputRef.current = customInput;
  }, [customInput]);

  // Parse value to array of selected surveys (excluding fixed header DINAS SURVEY KLAS)
  const selectedSurveys = useMemo(() => {
    let list = [];
    if (Array.isArray(value)) {
      list = value.filter(Boolean);
    } else if (typeof value === 'string' && value.trim()) {
      list = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return list.filter((s) => s.toUpperCase() !== 'DINAS SURVEY KLAS');
  }, [value]);

  useEffect(() => {
    selectedSurveysRef.current = selectedSurveys;
  }, [selectedSurveys]);

  // Sinkronisasi dengan adminSettings.customSurveyTypes jika ada pembaruan dari cloud
  useEffect(() => {
    if (Array.isArray(adminSettings?.customSurveyTypes) && adminSettings.customSurveyTypes.length > 0) {
      setCustomSavedTypes((prev) => {
        const defaultSet = new Set(DEFAULT_SURVEY_TYPES.map((d) => d.toUpperCase()));
        const prevSet = new Set(prev.map((t) => t.toUpperCase()));
        let hasNew = false;
        const merged = [...prev];
        adminSettings.customSurveyTypes.forEach((t) => {
          const upper = typeof t === 'string' ? t.trim().toUpperCase() : '';
          if (upper && !defaultSet.has(upper) && !prevSet.has(upper)) {
            merged.push(upper);
            prevSet.add(upper);
            hasNew = true;
          }
        });
        if (hasNew) {
          saveCustomTypes(merged);
          return merged;
        }
        return prev;
      });
    }
  }, [adminSettings?.customSurveyTypes]);

  // Sinkronisasi event internal antar-komponen & multi-tab storage
  useEffect(() => {
    const handleSync = (e) => {
      if (Array.isArray(e.detail)) {
        setCustomSavedTypes(e.detail);
      } else {
        setCustomSavedTypes(loadCustomTypes());
      }
    };
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === 'st_admin_settings') {
        setCustomSavedTypes(loadCustomTypes());
      }
    };
    window.addEventListener('st_custom_survey_types_updated', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('st_custom_survey_types_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateSelection = (newList) => {
    if (disabled) return;
    const joined = newList.map((s) => s.trim().toUpperCase()).filter(Boolean).join(', ');
    if (onChange) onChange(joined);
  };

  // Commit dan simpan input kustom (dipanggil saat klik "+ Tambah", Enter, onBlur, atau klik di luar dropdown)
  const commitCustomInput = (textToCommit = customInput) => {
    if (disabled) return false;
    const raw = (typeof textToCommit === 'string' ? textToCommit : customInput).trim();
    if (!raw) return false;

    // Pisahkan koma jika pengguna mengetik beberapa survei sekaligus
    const items = raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (items.length === 0) return false;

    const defaultSet = new Set(DEFAULT_SURVEY_TYPES.map((d) => d.toUpperCase()));
    const curSelected = selectedSurveysRef.current || selectedSurveys;
    const newSelected = [...curSelected];
    const newCustomToSave = [];
    const currentSavedSet = new Set(customSavedTypes.map((t) => t.toUpperCase()));

    items.forEach((cleanItem) => {
      // Tambahkan ke pilihan yang tercentang jika belum ada
      if (!newSelected.some((s) => s.toUpperCase() === cleanItem)) {
        newSelected.push(cleanItem);
      }

      // Jika bukan tipe bawaan BKI dan belum tersimpan, simpan permanen
      if (!defaultSet.has(cleanItem) && !currentSavedSet.has(cleanItem)) {
        newCustomToSave.push(cleanItem);
        currentSavedSet.add(cleanItem);
      }
    });

    // Perbarui pilihan aktif
    updateSelection(newSelected);

    // Simpan tipe kustom baru jika ada
    if (newCustomToSave.length > 0) {
      const updatedList = [...customSavedTypes, ...newCustomToSave];
      setCustomSavedTypes(updatedList);
      saveCustomTypes(updatedList);

      // Sinkronisasi ke Cloud Settings bila context tersedia
      if (updateAdminSettings) {
        updateAdminSettings({ customSurveyTypes: updatedList });
      }

      // Broadcast event ke instance MultiSurveySelect atau tabel lain
      window.dispatchEvent(
        new CustomEvent('st_custom_survey_types_updated', { detail: updatedList })
      );

      toast.success(
        `Jenis survei "${newCustomToSave.join(', ')}" berhasil ditambahkan & disimpan ke dropdown!`,
        { id: 'custom-survey-add', duration: 3000 }
      );
    }

    setCustomInput('');
    return true;
  };

  commitCustomInputRef.current = commitCustomInput;

  // Tutup dropdown saat klik di luar dan auto-commit input jika ada teks yang sedang diketik
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (customInputRef.current && customInputRef.current.trim()) {
          commitCustomInputRef.current?.(customInputRef.current);
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (type) => {
    if (disabled) return;
    const upperType = type.trim().toUpperCase();
    const exists = selectedSurveys.some((s) => s.toUpperCase() === upperType);
    const updated = exists
      ? selectedSurveys.filter((s) => s.toUpperCase() !== upperType)
      : [...selectedSurveys, upperType];
    updateSelection(updated);
  };

  const handleRemoveOption = (typeToRemove, e) => {
    if (disabled) return;
    e?.stopPropagation();
    updateSelection(selectedSurveys.filter((s) => s.toUpperCase() !== typeToRemove.toUpperCase()));
  };

  const handleSelectAll = (e) => {
    if (disabled) return;
    e?.stopPropagation();
    // Pilih semua tipe default + tipe kustom
    const all = Array.from(new Set([...DEFAULT_SURVEY_TYPES, ...allCustomTypes]));
    updateSelection(all);
  };

  // Hapus custom type dari daftar dan dari selection jika sedang dipilih
  const handleDeleteCustomType = (typeToDelete, e) => {
    e?.stopPropagation();
    const upper = typeToDelete.toUpperCase();
    const updatedCustom = customSavedTypes.filter((t) => t.toUpperCase() !== upper);
    setCustomSavedTypes(updatedCustom);
    saveCustomTypes(updatedCustom);

    if (updateAdminSettings) {
      updateAdminSettings({ customSurveyTypes: updatedCustom });
    }

    window.dispatchEvent(
      new CustomEvent('st_custom_survey_types_updated', { detail: updatedCustom })
    );

    const updatedSelection = selectedSurveys.filter((s) => s.toUpperCase() !== upper);
    if (updatedSelection.length !== selectedSurveys.length) {
      updateSelection(updatedSelection);
    }

    toast.success(`Jenis survei "${upper}" dihapus dari daftar custom`, {
      id: 'custom-survey-del',
      duration: 2500
    });
  };

  const isCustomType = (type) =>
    !DEFAULT_SURVEY_TYPES.some((d) => d.toUpperCase() === type.toUpperCase());

  // Kumpulkan semua tipe kustom (dari customSavedTypes + yang sedang dipilih di value)
  const allCustomTypes = useMemo(() => {
    const defaultSet = new Set(DEFAULT_SURVEY_TYPES.map((d) => d.toUpperCase()));
    const result = [];
    const addedSet = new Set();

    customSavedTypes.forEach((t) => {
      const upper = (t || '').trim().toUpperCase();
      if (upper && !defaultSet.has(upper) && !addedSet.has(upper)) {
        result.push(upper);
        addedSet.add(upper);
      }
    });

    selectedSurveys.forEach((s) => {
      const upper = (s || '').trim().toUpperCase();
      if (upper && !defaultSet.has(upper) && !addedSet.has(upper)) {
        result.push(upper);
        addedSet.add(upper);
      }
    });

    return result;
  }, [customSavedTypes, selectedSurveys]);

  // Filter berdasarkan kata pencarian
  const filteredCustomTypes = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return allCustomTypes;
    return allCustomTypes.filter((t) => t.includes(term));
  }, [allCustomTypes, searchTerm]);

  const filteredStandardTypes = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return DEFAULT_SURVEY_TYPES;
    return DEFAULT_SURVEY_TYPES.filter((t) => t.includes(term));
  }, [searchTerm]);

  const renderSurveyOption = (type, isCustom) => {
    const isSelected = selectedSurveys.some((s) => s.toUpperCase() === type.toUpperCase());
    return (
      <div
        key={type}
        onClick={() => handleToggleOption(type)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.45rem 0.6rem',
          borderRadius: 'var(--radius-sm, 6px)',
          cursor: 'pointer',
          fontSize: '0.825rem',
          fontWeight: isSelected ? 700 : 500,
          background: isSelected
            ? (isCustom ? 'rgba(234, 179, 8, 0.15)' : 'var(--accent-light, #e0f2fe)')
            : (isCustom ? 'rgba(234, 179, 8, 0.03)' : 'transparent'),
          color: isSelected
            ? (isCustom ? '#92400e' : 'var(--accent-primary, #0284c7)')
            : 'var(--text-primary)',
          border: isCustom
            ? (isSelected ? '1px solid rgba(234, 179, 8, 0.4)' : '1px dashed rgba(234, 179, 8, 0.25)')
            : '1px solid transparent',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = isCustom
              ? 'rgba(234, 179, 8, 0.1)'
              : 'var(--bg-card-hover, #f8fafc)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = isCustom
              ? 'rgba(234, 179, 8, 0.03)'
              : 'transparent';
          }
        }}
      >
        {/* Checkbox */}
        <div
          style={{
            width: '17px',
            height: '17px',
            borderRadius: '4px',
            border: isSelected
              ? `1.5px solid ${isCustom ? '#d97706' : 'var(--accent-primary, #0284c7)'}`
              : '1.5px solid var(--border-color-strong, #cbd5e1)',
            background: isSelected
              ? (isCustom ? '#d97706' : 'var(--accent-primary, #0284c7)')
              : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </div>

        {/* Label */}
        <span style={{ flex: 1, wordBreak: 'break-word', letterSpacing: '0.01em' }}>{type}</span>

        {/* Badge "CUSTOM" + tombol hapus untuk custom types */}
        {isCustom && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '0.12rem 0.4rem',
                borderRadius: '999px',
                background: 'rgba(234,179,8,0.22)',
                color: '#92400e',
                border: '1px solid rgba(234,179,8,0.4)',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}
            >
              CUSTOM
            </span>
            <button
              type="button"
              title="Hapus dari daftar jenis survei custom"
              onClick={(e) => handleDeleteCustomType(type, e)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '0.15rem 0.25rem',
                display: 'flex',
                alignItems: 'center',
                color: '#ef4444',
                opacity: 0.75,
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.75';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Box */}
      <div
        onClick={() => { if (!disabled) setIsOpen(!isOpen); }}
        style={{
          minHeight: '44px',
          padding: '0.4rem 0.6rem',
          background: disabled ? 'var(--bg-main)' : 'var(--bg-card-solid)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-color-strong)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.8 : 1,
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', flex: 1 }}>
          {selectedSurveys.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.2rem 0.25rem' }}>
              {placeholder}
            </span>
          ) : (
            selectedSurveys.map((survey, index) => {
              const custom = isCustomType(survey);
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: custom ? 'rgba(234,179,8,0.15)' : 'var(--status-running-bg)',
                    color: custom ? '#92400e' : 'var(--status-running-text)',
                    border: `1px solid ${custom ? 'rgba(234,179,8,0.45)' : 'var(--status-running-border)'}`,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    animation: 'fadeIn 0.15s ease'
                  }}
                >
                  {custom
                    ? <Bookmark size={12} color="#d97706" style={{ flexShrink: 0 }} />
                    : <Tag size={12} style={{ flexShrink: 0 }} />
                  }
                  <span>{survey}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveOption(survey, e)}
                      title={`Hapus ${survey}`}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'inherit',
                        opacity: 0.7
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>
        <ChevronDown
          size={17}
          color="var(--text-muted)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }}
        />
      </div>

      {/* Helper text */}
      {!disabled && !isOpen && selectedSurveys.length > 0 && (
        <div style={{ fontSize: '0.71rem', color: 'var(--accent-primary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Tag size={11} />
          <span>{selectedSurveys.length} jenis survei dipilih — Klik untuk menambah / mengubah</span>
        </div>
      )}
      {!disabled && !isOpen && selectedSurveys.length === 0 && (
        <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Tag size={11} />
          <span>Klik dropdown untuk memilih atau menambah jenis survei manual</span>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-card)',
            border: '1.5px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            boxShadow: '0 10px 32px rgba(0,0,0,0.18)',
            animation: 'fadeIn 0.12s ease'
          }}
        >
          {/* Search Box & Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.55rem', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flex: 1,
                background: 'var(--bg-card-solid)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.3rem 0.5rem'
              }}
            >
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari jenis survei..."
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              />
              {searchTerm && (
                <X
                  size={13}
                  color="var(--text-muted)"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSearchTerm('')}
                />
              )}
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              title="Pilih semua jenis survei yang tersedia"
              style={{
                padding: '0.3rem 0.55rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-light)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              Pilih Semua
            </button>
          </div>

          {/* Custom Survey Input */}
          <div
            style={{
              marginBottom: '0.65rem',
              paddingBottom: '0.65rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={13} color="var(--accent-primary)" />
                <span>Isi Manual / Custom Jenis Survei:</span>
              </div>
              {customSavedTypes.length > 0 && (
                <span style={{ fontSize: '0.68rem', color: '#b45309', background: 'rgba(234, 179, 8, 0.15)', padding: '0.05rem 0.4rem', borderRadius: '999px', fontWeight: 700 }}>
                  {customSavedTypes.length} tersimpan di dropdown
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onBlur={() => {
                  if (customInput.trim()) {
                    commitCustomInput(customInput);
                  }
                }}
                placeholder="Ketik jenis survei manual... (Tekan Enter atau klik Tambah)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitCustomInput(customInput);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.6rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: customInput.trim() ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-card-solid)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'border 0.15s ease'
                }}
              />
              <button
                type="button"
                onClick={() => commitCustomInput(customInput)}
                disabled={!customInput.trim()}
                title="Tambahkan & simpan jenis survei ini ke dropdown secara permanen"
                style={{
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: customInput.trim() ? 'var(--accent-primary)' : 'var(--bg-card)',
                  color: customInput.trim() ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (customInput.trim()) e.currentTarget.style.background = 'var(--accent-dark)';
                }}
                onMouseLeave={(e) => {
                  if (customInput.trim()) e.currentTarget.style.background = 'var(--accent-primary)';
                }}
              >
                <Plus size={13} /> Tambah
              </button>
            </div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '0.1rem' }}>
              💡 Input manual otomatis tersimpan sebagai jenis survei baru dan langsung dicentang di daftar dropdown di atas.
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              paddingRight: '0.2rem'
            }}
          >
            {filteredCustomTypes.length === 0 && filteredStandardTypes.length === 0 ? (
              <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Tidak ada jenis survei yang cocok dengan "{searchTerm}".
              </div>
            ) : (
              <>
                {/* 1. BAGIAN: JENIS SURVEI KUSTOM / TAMBAHAN (DITAMPILKAN PALING ATAS) */}
                {filteredCustomTypes.length > 0 && (
                  <div style={{ marginBottom: '0.35rem' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.3rem 0.5rem',
                        background: 'rgba(234, 179, 8, 0.1)',
                        borderRadius: '5px',
                        border: '1px solid rgba(234, 179, 8, 0.25)',
                        marginBottom: '0.35rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 800, color: '#b45309', letterSpacing: '0.03em' }}>
                        <Bookmark size={12} color="#d97706" />
                        <span>JENIS SURVEI KUSTOM / TAMBAHAN</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.05rem 0.35rem',
                          borderRadius: '999px',
                          background: '#d97706',
                          color: '#ffffff'
                        }}
                      >
                        {filteredCustomTypes.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {filteredCustomTypes.map((type) => renderSurveyOption(type, true))}
                    </div>
                  </div>
                )}

                {/* 2. BAGIAN: JENIS SURVEI STANDAR BKI */}
                {filteredStandardTypes.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.3rem 0.5rem',
                        background: 'var(--bg-main, #f1f5f9)',
                        borderRadius: '5px',
                        marginBottom: '0.35rem',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: 'var(--text-secondary, #475569)',
                        letterSpacing: '0.03em'
                      }}
                    >
                      <Tag size={12} color="var(--accent-primary, #0284c7)" />
                      <span>JENIS SURVEI STANDAR BKI</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {filteredStandardTypes.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {filteredStandardTypes.map((type) => renderSurveyOption(type, false))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
