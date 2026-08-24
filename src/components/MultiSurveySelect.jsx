import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Plus, Search, Tag } from 'lucide-react';

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

export default function MultiSurveySelect({
  value = '',
  onChange,
  placeholder = '-- PILIH JENIS SURVEY (BISA LEBIH DARI 1) --',
  required = false,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const containerRef = useRef(null);

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

  // Combine default types + any custom types already in value
  const allAvailableTypes = useMemo(() => {
    const set = new Set(DEFAULT_SURVEY_TYPES);
    selectedSurveys.forEach((s) => set.add(s.toUpperCase()));
    return Array.from(set);
  }, [selectedSurveys]);

  // Filter based on search term
  const filteredTypes = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return allAvailableTypes;
    return allAvailableTypes.filter((t) => t.includes(term));
  }, [allAvailableTypes, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateSelection = (newList) => {
    if (disabled) return;
    const joined = newList.map((s) => s.trim().toUpperCase()).filter(Boolean).join(', ');
    if (onChange) {
      onChange(joined);
    }
  };

  const handleToggleOption = (type) => {
    if (disabled) return;
    const upperType = type.trim().toUpperCase();
    const exists = selectedSurveys.some((s) => s.toUpperCase() === upperType);
    let updated;
    if (exists) {
      updated = selectedSurveys.filter((s) => s.toUpperCase() !== upperType);
    } else {
      updated = [...selectedSurveys, upperType];
    }
    updateSelection(updated);
  };

  const handleRemoveOption = (typeToRemove, e) => {
    if (disabled) return;
    e?.stopPropagation();
    const updated = selectedSurveys.filter((s) => s.toUpperCase() !== typeToRemove.toUpperCase());
    updateSelection(updated);
  };

  const handleSelectAll = (e) => {
    if (disabled) return;
    e?.stopPropagation();
    updateSelection(DEFAULT_SURVEY_TYPES);
  };

  const handleClearAll = (e) => {
    if (disabled) return;
    e?.stopPropagation();
    updateSelection([]);
  };

  const handleAddCustom = (e) => {
    if (disabled) return;
    e?.preventDefault();
    if (!customInput.trim()) return;
    const clean = customInput.trim().toUpperCase();
    if (!selectedSurveys.some((s) => s.toUpperCase() === clean)) {
      updateSelection([...selectedSurveys, clean]);
    }
    setCustomInput('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Box */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
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
            selectedSurveys.map((survey, index) => (
              <span
                key={index}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'var(--status-running-bg)',
                  color: 'var(--status-running-text)',
                  border: '1px solid var(--status-running-border)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  animation: 'fadeIn 0.15s ease'
                }}
              >
                <Tag size={12} style={{ flexShrink: 0 }} />
                <span>{survey}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveOption(survey, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      borderRadius: '50%',
                      opacity: 0.85
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
                    title="Hapus jenis survei ini"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))
          )}
        </div>

        {!disabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
            <ChevronDown
              size={16}
              style={{
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}
            />
          </div>
        )}
      </div>

      {/* Helper Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.3rem',
          fontSize: '0.725rem',
          color: 'var(--text-muted)'
        }}
      >
        <span>
          📋 {selectedSurveys.length > 0 ? `${selectedSurveys.length} jenis survei dipilih` : 'Klik dropdown untuk mencentang jenis survei'}
        </span>
        {!disabled && selectedSurveys.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--status-danger-text)',
              fontSize: '0.725rem',
              cursor: 'pointer',
              fontWeight: 600,
              textDecoration: 'underline'
            }}
          >
            Reset Pilihan
          </button>
        )}
      </div>

      {/* Dropdown Popover */}
      {!disabled && isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 120,
            background: 'var(--bg-modal)',
            border: '1.5px solid var(--border-color-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.6rem',
            animation: 'slideDown 0.15s ease'
          }}
        >
          {/* Search Box & Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', alignItems: 'center' }}>
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

            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Pilih Semua
              </button>
            </div>
          </div>

          {/* Options List */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              paddingRight: '0.2rem'
            }}
          >
            {filteredTypes.length === 0 ? (
              <div style={{ padding: '0.8rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Tidak ada jenis survei yang cocok dengan kata kunci.
              </div>
            ) : (
              filteredTypes.map((type) => {
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
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.825rem',
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-color-strong)',
                        background: isSelected ? 'var(--accent-primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span style={{ flex: 1 }}>{type}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Custom Survey Input */}
          <div
            style={{
              marginTop: '0.6rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              <Plus size={13} color="var(--accent-primary)" />
              <span>Input Manual / Custom:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ketik jenis survei lainnya... (misal: PERBAIKAN MESIN)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustom(e);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.4rem 0.55rem',
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
                onClick={handleAddCustom}
                disabled={!customInput.trim()}
                title="Tambahkan jenis survei custom"
                style={{
                  padding: '0.4rem 0.7rem',
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
                  transition: 'all 0.15s ease',
                  boxShadow: customInput.trim() ? 'var(--shadow-sm)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (customInput.trim()) {
                    e.currentTarget.style.background = 'var(--accent-dark)';
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (customInput.trim()) {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <Plus size={13} /> Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
