import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, X, MapPin } from 'lucide-react';

/**
 * Komponen dropdown lokasi dengan fitur pencarian.
 * Menggantikan <select> biasa agar user dapat mencari lokasi dengan cepat.
 *
 * Props:
 *  - activeTariffs: array tarif lokasi
 *  - value: lokasi terpilih saat ini (string)
 *  - onChange: callback (value: string) saat lokasi dipilih
 *  - getLocationCategory: fungsi untuk menentukan kategori lokasi
 *  - showRate: boolean, apakah menampilkan tarif di samping nama lokasi (default: false)
 *  - formatRupiah: fungsi format rupiah (wajib jika showRate=true)
 *  - disabled: boolean
 *  - required: boolean
 */
export default function SearchableLocationSelect({
  activeTariffs = [],
  value = '',
  onChange,
  getLocationCategory,
  showRate = false,
  formatRupiah,
  disabled = false,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

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

  // Split tariffs into categories
  const { dalamKota, luarKota } = useMemo(() => {
    const dk = [];
    const lk = [];
    activeTariffs.forEach((t) => {
      const cat = t.kategori || (getLocationCategory ? getLocationCategory(t.name, activeTariffs) : 'Dalam Kota');
      if (cat === 'Luar Kota') {
        lk.push(t);
      } else {
        dk.push(t);
      }
    });
    return { dalamKota: dk, luarKota: lk };
  }, [activeTariffs, getLocationCategory]);

  // Filter based on search term
  const filteredDalamKota = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return dalamKota;
    return dalamKota.filter((t) => {
      const name = (t.tujuan || t.name || '').toUpperCase();
      const rincian = (t.rincian || '').toUpperCase();
      return name.includes(term) || rincian.includes(term);
    });
  }, [dalamKota, searchTerm]);

  const filteredLuarKota = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    if (!term) return luarKota;
    return luarKota.filter((t) => {
      const name = (t.tujuan || t.name || '').toUpperCase();
      const rincian = (t.rincian || '').toUpperCase();
      return name.includes(term) || rincian.includes(term);
    });
  }, [luarKota, searchTerm]);

  const totalFiltered = filteredDalamKota.length + filteredLuarKota.length;

  // Get display text for currently selected value
  const selectedDisplay = useMemo(() => {
    if (!value) return '';
    const found = activeTariffs.find(
      (t) => (t.tujuan || t.name) === value
    );
    if (found) {
      const label = found.tujuan || found.name;
      const rincian = found.rincian ? ` (${found.rincian})` : '';
      const rate = showRate && formatRupiah ? ` - ${formatRupiah(found.rate)}` : '';
      return `${label}${rincian}${rate}`;
    }
    return value;
  }, [value, activeTariffs, showRate, formatRupiah]);

  const handleSelect = (tariff) => {
    if (disabled) return;
    const val = tariff.tujuan || tariff.name;
    if (onChange) onChange(val);
    setSearchTerm('');
    setIsOpen(false);
  };

  const getItemLabel = (t) => {
    const name = t.tujuan || t.name;
    const rincian = t.rincian ? ` (${t.rincian})` : '';
    const rate = showRate && formatRupiah ? ` - ${formatRupiah(t.rate)}` : '';
    return `${name}${rincian}${rate}`;
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Hidden input for form required validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
          tabIndex={-1}
        />
      )}

      {/* Selected Value + Search Input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: disabled ? 'var(--bg-main)' : 'var(--bg-card)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm, 8px)',
          padding: '0.45rem 0.65rem',
          gap: '0.5rem',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
          opacity: disabled ? 0.75 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          minHeight: '38px',
        }}
      >
        <MapPin size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />

        {!isOpen ? (
          <div
            style={{
              flex: 1,
              fontSize: '0.84rem',
              fontWeight: 700,
              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedDisplay || '-- Pilih Lokasi --'}
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              e.stopPropagation();
              setSearchTerm(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const allFiltered = [...filteredDalamKota, ...filteredLuarKota];
                if (allFiltered.length > 0) {
                  handleSelect(allFiltered[0]);
                }
              }
              if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            placeholder="🔍 Ketik nama lokasi untuk mencari..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '100%',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
              cursor: 'text',
            }}
          />
        )}

        {isOpen && searchTerm && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              inputRef.current?.focus();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Hapus pencarian"
          >
            <X size={14} />
          </button>
        )}

        <div style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Dropdown List */}
      {!disabled && isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: 'var(--bg-surface, #ffffff)',
            border: '1.5px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '0.25rem 0',
          }}
        >
          {/* Search count header */}
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              padding: '0.35rem 0.75rem',
              borderBottom: '1px solid var(--border-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {searchTerm
                ? `${totalFiltered} lokasi ditemukan`
                : `${activeTariffs.length} lokasi tersedia`}
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {searchTerm ? 'Klik untuk Pilih' : 'Ketik untuk Cari'}
            </span>
          </div>

          {totalFiltered === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Tidak ditemukan lokasi dengan kata kunci "<strong>{searchTerm}</strong>".
            </div>
          ) : (
            <>
              {/* DALAM KOTA */}
              {filteredDalamKota.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#059669',
                      padding: '0.45rem 0.75rem 0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      background: 'rgba(5, 150, 105, 0.04)',
                    }}
                  >
                    📍 Dalam Kota (Pontianak & Sekitarnya)
                  </div>
                  {filteredDalamKota.map((t, idx) => {
                    const itemValue = t.tujuan || t.name;
                    const isSelected = itemValue === value;
                    return (
                      <div
                        key={`dk-${idx}`}
                        onClick={() => handleSelect(t)}
                        style={{
                          padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          borderBottom: '1px solid rgba(0,0,0,0.03)',
                          transition: 'background 0.1s ease',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.06)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(5, 150, 105, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected ? 'rgba(2, 132, 199, 0.06)' : 'transparent';
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getItemLabel(t)}
                        </span>
                        {isSelected && (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>✓</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {/* LUAR KOTA */}
              {filteredLuarKota.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#2563eb',
                      padding: '0.45rem 0.75rem 0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      background: 'rgba(37, 99, 235, 0.04)',
                      borderTop: filteredDalamKota.length > 0 ? '1.5px solid var(--border-color)' : 'none',
                    }}
                  >
                    ✈️ Luar Kota
                  </div>
                  {filteredLuarKota.map((t, idx) => {
                    const itemValue = t.tujuan || t.name;
                    const isSelected = itemValue === value;
                    return (
                      <div
                        key={`lk-${idx}`}
                        onClick={() => handleSelect(t)}
                        style={{
                          padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          borderBottom: '1px solid rgba(0,0,0,0.03)',
                          transition: 'background 0.1s ease',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                          background: isSelected ? 'rgba(2, 132, 199, 0.06)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = isSelected ? 'rgba(2, 132, 199, 0.06)' : 'transparent';
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {getItemLabel(t)}
                        </span>
                        {isSelected && (
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>✓</span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
