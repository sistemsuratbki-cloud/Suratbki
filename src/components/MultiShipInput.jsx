import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Anchor, X, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function MultiShipInput({
  value = '',
  onChange,
  placeholder = 'Ketik nama kapal lalu tekan Enter atau koma (,)...',
  required = false
}) {
  const { suratTugas = [], laporanPerjalanan = [] } = useData();
  const [inputValue, setInputValue] = useState('');
  const [isOpenSuggestions, setIsOpenSuggestions] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Parse value string to array of ships
  const ships = useMemo(() => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [value]);

  // Extract unique ship names from existing database for auto-suggestions
  const knownShips = useMemo(() => {
    const list = new Set();
    // Default common vessels
    ['KAPUAS BAHARI XXII', 'TB. SAMUDRA 01', 'BG. SAMUDRA 02', 'MV. TANJUNG PURA', 'TB. MITRA JAYA', 'TK. MARITIM 08'].forEach(
      (v) => list.add(v)
    );

    suratTugas.forEach((st) => {
      if (st.namaKapal) {
        st.namaKapal
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .forEach((v) => list.add(v));
      }
    });

    laporanPerjalanan.forEach((lp) => {
      if (lp.namaKapal) {
        lp.namaKapal
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .forEach((v) => list.add(v));
      }
    });

    return Array.from(list);
  }, [suratTugas, laporanPerjalanan]);

  // Filtered suggestions based on user typing
  const filteredSuggestions = useMemo(() => {
    const term = inputValue.trim().toUpperCase();
    return knownShips
      .filter((k) => !ships.some((s) => s.toUpperCase() === k))
      .filter((k) => (term ? k.includes(term) : true))
      .slice(0, 8);
  }, [knownShips, ships, inputValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpenSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateShips = (newShips) => {
    const joined = newShips.map((s) => s.trim().toUpperCase()).filter(Boolean).join(', ');
    if (onChange) {
      onChange(joined);
    }
  };

  const handleAddShip = (rawName) => {
    if (!rawName) return;
    // Support comma-separated batch input
    const parts = rawName
      .split(',')
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    if (parts.length === 0) return;

    const newShips = [...ships];
    parts.forEach((p) => {
      if (!newShips.some((item) => item.toUpperCase() === p)) {
        newShips.push(p);
      }
    });

    updateShips(newShips);
    setInputValue('');
    setIsOpenSuggestions(false);
  };

  const handleRemoveShip = (indexToRemove, e) => {
    e?.stopPropagation();
    const newShips = ships.filter((_, idx) => idx !== indexToRemove);
    updateShips(newShips);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddShip(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && ships.length > 0) {
      handleRemoveShip(ships.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      handleAddShip(inputValue);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Container Box */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          minHeight: '44px',
          padding: '0.4rem 0.6rem',
          background: 'var(--bg-card-solid)',
          border: '1.5px solid var(--border-color-strong)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'text',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Selected Ships Badges */}
        {ships.map((ship, index) => (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--accent-primary)',
              padding: '0.25rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.825rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            <Anchor size={13} style={{ flexShrink: 0 }} />
            <span>{ship}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveShip(index, e)}
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
                opacity: 0.8
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
              title="Hapus kapal ini"
            >
              <X size={13} />
            </button>
          </span>
        ))}

        {/* Text Input */}
        <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', minWidth: '150px' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpenSuggestions(true);
            }}
            onFocus={() => setIsOpenSuggestions(true)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={ships.length === 0 ? placeholder : '+ Tambah kapal lain...'}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              padding: '0.2rem 0.3rem'
            }}
            required={required && ships.length === 0}
          />
        </div>

        {/* Quick Add Button if typed */}
        {inputValue.trim() && (
          <button
            type="button"
            onClick={() => handleAddShip(inputValue)}
            style={{
              padding: '0.2rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            <Plus size={12} /> Tambah
          </button>
        )}
      </div>

      {/* Info / Helper Badge */}
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
          💡 {ships.length > 0 ? `${ships.length} Kapal/Objek dipilih` : 'Bisa memilih/mengetik lebih dari satu kapal'}
        </span>
        {ships.length > 1 && (
          <button
            type="button"
            onClick={() => updateShips([])}
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
            Hapus Semua ({ships.length})
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpenSuggestions && filteredSuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--bg-modal)',
            border: '1px solid var(--border-color-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '0.4rem',
            maxHeight: '180px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              padding: '0.25rem 0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Saran / Riwayat Kapal
          </div>
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                handleAddShip(suggestion);
              }}
              style={{
                padding: '0.45rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Anchor size={13} color="var(--accent-primary)" />
                <span>{suggestion}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700 }}>+ Tambah</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
