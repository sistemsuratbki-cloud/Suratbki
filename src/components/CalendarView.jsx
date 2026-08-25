import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { filterDataByRole } from '../utils/filterData';
import { checkHolidayOrWeekend } from '../utils/holidays';
import { DayDetailModal } from './DayDetailModal';

export const CalendarView = ({ surveyorFilter }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();
  const { currentUser, role } = useAuth();

  // Filter tasks & reports specifically for logged-in surveyor
  // Exclude pending SPS that has not been filled as PDS yet
  const isPdsItem = (st) => st.docType === 'PDS' || st.isPds || (st.status !== 'Menunggu Survei' && !st.isSps && st.docType !== 'SPS');

  const filteredSuratTugas = filterDataByRole(suratTugas, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter)
    .filter(item => isPdsItem(item));

  const filteredKwitansi = filterDataByRole(kwitansiHonor, currentUser, role, 'penerima')
    .filter(item => !surveyorFilter || item.penerima === surveyorFilter);
  const filteredLaporan = filterDataByRole(laporanSurvei, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);

  // Default to today's current date / month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid starting on Sunday (Min, Sen, Sel, Rab, Kam, Jum, Sab)
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const daysArray = [];

  // Previous month padding days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const pYear = prevMonthDate.getFullYear();
    const pMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const pDay = String(prevMonthDate.getDate()).padStart(2, '0');
    const pDateStr = `${pYear}-${pMonth}-${pDay}`;

    daysArray.push({
      dayNumber: d,
      dateObj: prevMonthDate,
      isCurrentMonth: false,
      dateStr: pDateStr,
      isToday: pDateStr === todayDateStr
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;

    daysArray.push({
      dayNumber: d,
      dateObj: new Date(year, month, d),
      isCurrentMonth: true,
      dateStr: dateStr,
      isToday: dateStr === todayDateStr
    });
  }

  // Next month padding days
  const remaining = 35 - daysArray.length > 0 ? 35 - daysArray.length : 42 - daysArray.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const nYear = nextMonthDate.getFullYear();
    const nMonth = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const nDay = String(nextMonthDate.getDate()).padStart(2, '0');
    const nDateStr = `${nYear}-${nMonth}-${nDay}`;

    daysArray.push({
      dayNumber: d,
      dateObj: nextMonthDate,
      isCurrentMonth: false,
      dateStr: nDateStr,
      isToday: nDateStr === todayDateStr
    });
  }

  // Active items for a date based on filtered list
  const getEventsForDate = (dateStr) => {
    const stList = filteredSuratTugas.filter((st) => {
      const isDateMatch = dateStr >= st.tglMulai && dateStr <= st.tglSelesai;
      return isDateMatch;
    });
    const kwList = filteredKwitansi.filter((k) => k.tglBayar === dateStr || (k.status === 'Belum Dibayar' && stList.some((s) => s.id === k.suratId)));
    const lapList = filteredLaporan.filter((l) => l.tglLapor === dateStr);

    return { stList, kwList, lapList };
  };

  const handleCellClick = (cell) => {
    setSelectedDateStr(cell.dateStr);
    setIsModalOpen(true);
  };

  const tasksOnSelectedDate = selectedDateStr
    ? filteredSuratTugas.filter((st) => selectedDateStr >= st.tglMulai && selectedDateStr <= st.tglSelesai)
    : [];

  const isCurrentMonthActive = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="card-section" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: 'none' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {role === 'surveyor' ? `Jadwal Tugas Personal (${currentUser?.name})` : 'Jadwal Tugas Survei Kapal'}
          </h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.1rem' }}>
            {monthNames[month]} {year} {role === 'surveyor' && '• Menampilkan jadwal penugasan Anda saja'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${isCurrentMonthActive ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleToday}
            title="Lompat ke tanggal & bulan hari ini"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <CalendarIcon size={14} />
            <span>Hari Ini</span>
          </button>
          <button className="btn btn-secondary btn-icon" onClick={handlePrevMonth} title="Bulan Sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <button className="btn btn-secondary btn-icon" onClick={handleNextMonth} title="Bulan Berikutnya">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Swipe Hint */}
      <div className="mobile-calendar-hint">
        <span>👈 Geser kalender ke kiri / kanan untuk memilih tanggal 👉</span>
      </div>

      <div className="calendar-scroll-wrapper">
        <div className="calendar-grid-v2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((dayName) => (
            <div key={dayName} className="calendar-day-header-v2">
              {dayName}
            </div>
          ))}

          {daysArray.map((cell, index) => {
          const { stList } = getEventsForDate(cell.dateStr);
          const holInfo = checkHolidayOrWeekend(cell.dateStr);

          let cellStyle = {};
          if (cell.isToday) {
            cellStyle = { border: '2px solid var(--accent-primary)', background: 'var(--accent-light)', position: 'relative' };
          } else if (holInfo.isHoliday) {
            cellStyle = { background: 'rgba(239, 68, 68, 0.04)' };
          } else if (holInfo.isWeekend) {
            cellStyle = { background: 'rgba(241, 245, 249, 0.5)' };
          }

          return (
            <div
              key={index}
              className={`calendar-cell-v2 ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''} ${holInfo.isHolidayOrWeekend ? 'is-holiday' : ''}`}
              onClick={() => handleCellClick(cell)}
              style={cellStyle}
              title={
                holInfo.isHolidayOrWeekend
                  ? `${holInfo.holidayName ? holInfo.holidayName + ' • ' : ''}Hari Libur / Akhir Pekan (${holInfo.dayName}) — Uang Harian Naik +50%`
                  : ''
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', gap: '0.25rem' }}>
                <div
                  className="calendar-date-number-v2"
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    color: cell.isToday
                      ? 'var(--accent-primary)'
                      : holInfo.isHoliday
                      ? '#dc2626'
                      : holInfo.isWeekend
                      ? '#e11d48'
                      : 'inherit'
                  }}
                >
                  {cell.dayNumber}
                </div>
                
                {cell.isToday ? (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      background: 'var(--accent-primary)',
                      color: '#ffffff',
                      padding: '0.08rem 0.35rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    Hari Ini
                  </span>
                ) : holInfo.isHoliday ? (
                  <span
                    style={{
                      fontSize: '0.525rem',
                      fontWeight: 800,
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.05rem 0.3rem',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '85px'
                    }}
                    title={`${holInfo.holidayName}: Uang Harian +50%`}
                  >
                    🎉 Libur (+50%)
                  </span>
                ) : holInfo.isWeekend ? (
                  <span
                    style={{
                      fontSize: '0.525rem',
                      fontWeight: 700,
                      color: '#e11d48',
                      background: 'rgba(225, 29, 72, 0.08)',
                      padding: '0.05rem 0.25rem',
                      borderRadius: '3px'
                    }}
                    title="Akhir Pekan: Uang Harian +50%"
                  >
                    +50% U.HR
                  </span>
                ) : null}
              </div>

              <div className="calendar-chips-wrapper">
                {stList.map((st) => {
                  const portShort = st.lokasi ? st.lokasi.split(',')[0] : 'Pelabuhan';
                  const startDateStr = st.tglMulai ? st.tglMulai.split('-').slice(1).join('/') : '';
                  const endDateStr = st.tglSelesai ? st.tglSelesai.split('-').slice(1).join('/') : '';

                  return (
                    <div
                      key={st.id}
                      className="calendar-chip chip-blue"
                      style={{
                        borderLeft: '3px solid var(--accent-primary)'
                      }}
                      title={`🚢 PDS - Kapal: ${st.namaKapal || 'KAPAL SURVEY'}\n📍 Lokasi: ${st.lokasi}\n📅 Periode: ${formatDateIndo(st.tglMulai)} s/d ${formatDateIndo(st.tglSelesai)}\n👤 Surveyor: ${st.petugas}`}
                    >
                      <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span>🚢</span>
                        <span>{st.namaKapal || 'KAPAL SURVEY'}</span>
                      </div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📍 {portShort} (PDS)
                      </div>
                      <div style={{ fontSize: '0.575rem', opacity: 0.85, fontWeight: 700, marginTop: '1px' }}>
                        📅 {startDateStr} s/d {endDateStr}
                      </div>
                      <div style={{ fontSize: '0.575rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        👤 {st.petugas ? st.petugas.split(' ')[0] : 'Surveyor'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="calendar-legend-footer" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="legend-dot dot-blue" />
          <span>🚢 Perjalanan Dinas Surveyor (PDS Aktif & Terbit)</span>
        </div>
      </div>

      <DayDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDateStr}
        tasksOnDate={tasksOnSelectedDate}
        kwitansiList={filteredKwitansi}
        laporanList={filteredLaporan}
      />
    </div>
  );
};

