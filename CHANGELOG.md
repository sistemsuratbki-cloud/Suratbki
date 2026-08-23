# Changelog

All notable changes to Sistem Informasi Surat Tugas BKI will be documented in this file.

## [1.1.0] - 2026-08-23

### ✨ Added - Data Dummy System

#### Data Dummy Default
- **5 Surat Tugas sampel** dengan berbagai status:
  - 3 PDS (Perjalanan Dinas Surveyor) yang sudah selesai
  - 2 SPS (Surat Persetujuan Survei) menunggu eksekusi
  - Lengkap dengan field: pangkat, jabatan, kategori perjalanan, sarana transportasi
- **3 Kwitansi Honorarium** dengan total Rp 16.700.000:
  - 1 sudah dibayar
  - 2 belum dibayar (Rp 13.700.000)
- **2 Laporan Survei** dengan berbagai status approval
  - Lengkap dengan field pangkat surveyor

#### Reset Functionality
- Tombol "Reset Data Demo" di header untuk Admin, Kepala Cabang, dan Developer
- Konfirmasi dengan password sebelum reset
- Reset mengembalikan data ke kondisi dummy default
- User accounts tetap tersimpan setelah reset

#### Documentation
- **DATA_DUMMY_INFO.md** - Dokumentasi lengkap data dummy dan skenario testing
- **QUICK_START.md** - Panduan cepat untuk pengguna baru
- **README.md** - Update dengan informasi data dummy
- **CHANGELOG.md** - File ini untuk tracking perubahan

### 🔧 Changed
- Reset data sekarang mengembalikan ke data dummy default (bukan mengosongkan)
- Label tombol reset diubah dari "Kosongkan Data" menjadi "Reset Data Demo"
- Message konfirmasi reset lebih informatif (menyebutkan jumlah data yang akan di-reset)

### 🎯 Testing Scenarios Available
1. **Alur Lengkap PDS** - KM MUTIARA LAUT (Selesai, ACC, Sudah Dibayar)
2. **Alur PDS dengan CITO** - TB SAMUDERA JAYA (Selesai, ACC, Belum Dibayar)
3. **Alur PDS Sedang Berjalan** - MV NUSANTARA EXPRESS (Berjalan, Belum ACC)
4. **Alur SPS Paraf Terkirim** - KM PELITA MARITIM (Menunggu Survei)
5. **Alur SPS Baru** - TB KARTIKA 05 (Menunggu Approval)

### 📝 Technical Details
- Modified: `src/utils/initialData.js` - Added realistic dummy data
- Modified: `src/context/DataContext.jsx` - Updated reset logic to restore defaults
- Modified: `src/components/Header.jsx` - Updated reset button label and confirmation
- Added: Documentation files (DATA_DUMMY_INFO.md, QUICK_START.md, CHANGELOG.md)

---

## [1.0.0] - 2026-08-10

### Initial Release
- Multi-role authentication system (Admin, Surveyor, Keuangan, Kepala Cabang)
- Surat Tugas management (SPS & PDS)
- Kwitansi Honorarium with ticket reimbursement
- Laporan Survei with approval workflow
- Calendar view for task monitoring
- Print templates (BKI official format)
- Master Tarif Lokasi & Grade management
- User management for Admin
- Settings & configuration panel
- Dark/Light theme toggle
- Supabase integration for cloud sync
- Excel export functionality
- File attachments support (photos, tickets, visit reports)

---

## Legend

- ✨ **Added** - New features
- 🔧 **Changed** - Changes in existing functionality
- 🐛 **Fixed** - Bug fixes
- 🗑️ **Deprecated** - Soon-to-be removed features
- ❌ **Removed** - Removed features
- 🔒 **Security** - Security improvements
- 📝 **Documentation** - Documentation changes

---

**Maintained by**: PT Biro Klasifikasi Indonesia (Persero)  
**Contact**: sistemsuratbki@gmail.com
