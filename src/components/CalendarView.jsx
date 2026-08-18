import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { filterDataByRole } from '../utils/filterData';
import { DayDetailModal } from './DayDetailModal';

export const CalendarView = ({ surveyorFilter }) => {
  const { suratTugas, kwitansiHonor, laporanSurvei } = useData();
  const { currentUser, role } = useAuth();

  // Filter tasks & reports specifically for logged-in surveyor
  const filteredSuratTugas = filterDataByRole(suratTugas, currentUser, role, 'petugas')
    .filter(item => !surveyorFilter || item.petugas === surveyorFilter);
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
    const stList = filteredSuratTugas.filter((st) => dateStr >= st.tglMulai && dateStr <= st.tglSelesai);
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

      <div className="calendar-grid-v2" style={{ padding: '0 1.5rem 1rem 1.5rem' }}>
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((dayName) => (
          <div key={dayName} className="calendar-day-header-v2">
            {dayName}
          </div>
        ))}

        {daysArray.map((cell, index) => {
          const { stList } = getEventsForDate(cell.dateStr);

          return (
            <div
              key={index}
              className={`calendar-cell-v2 ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
              onClick={() => handleCellClick(cell)}
              style={cell.isToday ? { border: '2px solid var(--accent-primary)', background: 'var(--accent-light)', position: 'relative' } : {}}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                <div
                  className="calendar-date-number-v2"
                  style={cell.isToday ? { color: 'var(--accent-primary)', fontWeight: 800, margin: 0 } : { margin: 0 }}
                >
                  {cell.dayNumber}
                </div>
                {cell.isToday && (
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
                )}
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
                      title={`🚢 Kapal: ${st.namaKapal || 'MV Samudra Jaya'}\n📍 Lokasi: ${st.lokasi}\n📅 Berangkat: ${formatDateIndo(st.tglMulai)} s/d Selesai: ${formatDateIndo(st.tglSelesai)}\n👤 Surveyor: ${st.petugas}`}
                    >
                      <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        🚢 {st.namaKapal || 'MV Samudra Jaya'}
                      </div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📍 {portShort}
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

      {/* Legend Footer */}
      <div className="calendar-legend-footer">
        <div className="legend-item">
          <span className="legend-dot dot-blue" />
          <span>
            {role === 'surveyor'
              ? `Surat Tugas Aktif (${currentUser?.name})`
              : 'Surat Tugas Survei Aktif (Nama Kapal, Lokasi, Tgl Berangkat & Selesai)'}
          </span>
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
