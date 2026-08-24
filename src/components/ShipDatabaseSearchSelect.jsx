import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function ShipDatabaseSearchSelect({
  shipDatabase = [],
  onSelect,
  placeholder = '-- 🚢 Ketik nama kapal atau no. agenda untuk mencari... --',
  style = {},
  disabled = false
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

  // Filter ships based on user search term
  const filteredShips = useMemo(() => {
    const cleanTerm = String(searchTerm || '').trim().toUpperCase();
    const safeDb = Array.isArray(shipDatabase) ? shipDatabase : [];
    if (!cleanTerm) return safeDb;
    return safeDb.filter((s) => {
      if (!s) return false;
      const name = String(s.namaKapal || '').toUpperCase();
      const agenda = String(s.noAgenda || '').toUpperCase();
      const order = String(s.noOrder || '').toUpperCase();
      return name.includes(cleanTerm) || agenda.includes(cleanTerm) || order.includes(cleanTerm);
    });
  }, [shipDatabase, searchTerm]);

  const handleItemClick = (ship) => {
    if (disabled || !ship) return;
    if (onSelect) {
      onSelect(ship);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      {/* Search Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: disabled ? 'var(--bg-main)' : 'var(--bg-card)',
          border: isOpen ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.35rem 0.65rem',
          gap: '0.5rem',
          boxShadow: isOpen ? '0 0 0 3px rgba(2, 132, 199, 0.15)' : 'none',
          opacity: disabled ? 0.75 : 1,
          cursor: disabled ? 'not-allowed' : 'default',
          transition: 'all 0.15s ease'
        }}
      >
        <Search size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={searchTerm}
          onChange={(e) => {
            if (disabled) return;
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' && filteredShips.length > 0) {
              e.preventDefault();
              handleItemClick(filteredShips[0]);
            }
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          placeholder={disabled ? 'Pencarian database dinonaktifkan (Dokumen Terkunci)' : placeholder}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            width: '100%',
            fontSize: '0.84rem',
            color: 'var(--text-primary)',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
        />

        {!disabled && searchTerm && (
          <button
            type="button"
            onClick={() => {
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
              alignItems: 'center'
            }}
            title="Hapus pencarian"
          >
            <X size={14} />
          </button>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isOpen ? 'Tutup daftar' : 'Buka daftar'}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Floating Suggestions / Dropdown List */}
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
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '0.35rem 0'
          }}
        >
          {filteredShips.length > 0 ? (
            <div>
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
                  alignItems: 'center'
                }}
              >
                <span>Daftar Kapal Database ({filteredShips.length})</span>
                <span>Ketik untuk Cari / Klik untuk Pilih</span>
              </div>
              {filteredShips.map((ship, idx) => (
                <div
                  key={`${ship.namaKapal}-${idx}`}
                  onClick={() => handleItemClick(ship)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    borderBottom: idx < filteredShips.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                    transition: 'background 0.1s ease',
                    fontSize: '0.82rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚢</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ship.namaKapal}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    {ship.jenisSurvey && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#059669',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}
                      >
                        {ship.jenisSurvey}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(2, 132, 199, 0.12)',
                        color: 'var(--accent-primary)',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px'
                      }}
                    >
                      Agenda: {ship.noAgenda || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {searchTerm ? (
                <>
                  Tidak ditemukan kapal dengan kata kunci "<strong>{searchTerm}</strong>".
                  <br />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'inline-block' }}>
                    Kapal baru dapat didaftarkan melalui form <strong>SPS Admin</strong>.
                  </span>
                </>
              ) : (
                'Belum ada riwayat kapal terdaftar di database.'
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
