# 🧪 Testing Checklist - Sistem Surat Tugas BKI

Checklist komprehensif untuk testing aplikasi dengan data dummy.

---

## 🎯 Pre-Testing Setup

- [ ] Reset data ke default (`Reset Data Demo` button)
- [ ] Browser dalam mode normal (bukan incognito)
- [ ] Dev server berjalan (`npm run dev`)
- [ ] Console browser terbuka (F12) untuk monitoring error

---

## 👤 Authentication & User Management

### Login System
- [ ] Login sebagai Admin (`admin` / `admin123`)
- [ ] Login sebagai Surveyor (`bone` / `password123`)
- [ ] Login sebagai Keuangan (`finance` / `password123`)
- [ ] Login sebagai Kepala Cabang (`muhson` / `password123`)
- [ ] Logout dan re-login berfungsi
- [ ] Session tetap tersimpan setelah refresh browser

### User Management (Admin Only)
- [ ] Lihat daftar user di tab "User Management"
- [ ] Tambah user baru
- [ ] Edit user existing
- [ ] Hapus user (selain akun sendiri)
- [ ] Reset password user

---

## 📅 Calendar View

### Navigasi Kalender
- [ ] Tampilan bulan berjalan muncul
- [ ] Navigasi ke bulan sebelumnya
- [ ] Navigasi ke bulan berikutnya
- [ ] Tombol "Hari Ini" berfungsi
- [ ] Indikator tugas muncul di tanggal yang sesuai

### Detail Hari
- [ ] Klik tanggal menampilkan daftar tugas hari itu
- [ ] Detail tugas lengkap (kapal, surveyor, lokasi, status)
- [ ] Warna status sesuai (hijau=selesai, kuning=berjalan, biru=menunggu)
- [ ] Klik tugas membuka detail/edit modal

---

## 📊 Dashboard Summary Cards

### Card Ringkasan
- [ ] **Tugas Berjalan**: Menampilkan jumlah yang benar
- [ ] **Honor Belum Dibayar**: Rp 13.700.000 (setelah reset)
- [ ] **Total Honor**: Rp 16.700.000 (setelah reset)
- [ ] **Laporan Draf**: Menampilkan jumlah yang benar
- [ ] Angka update real-time saat ada perubahan data

---

## 📝 Surat Tugas (PDS & SPS)

### Lihat Data
- [ ] Tabel menampilkan 5 surat tugas (3 PDS + 2 SPS)
- [ ] Filter berdasarkan status berfungsi
- [ ] Filter berdasarkan surveyor berfungsi
- [ ] Search by nama kapal berfungsi
- [ ] Sorting kolom berfungsi

### Tambah SPS Baru (Admin)
- [ ] Buka form "SPS Baru"
- [ ] Isi single ship
- [ ] Isi multiple ships (batch)
- [ ] Upload file (optional)
- [ ] Simpan dan verify data masuk ke tabel

### Edit SPS
- [ ] Buka SPS existing
- [ ] Edit data (kapal, lokasi, surveyor, dll)
- [ ] Update file attachments
- [ ] Simpan dan verify perubahan tersimpan

### Kirim Paraf (Admin)
- [ ] Pilih SPS "TB KARTIKA 05" (belum kirim paraf)
- [ ] Klik "Kirim Paraf"
- [ ] Verify status berubah & timestamp tersimpan

### Surveyor Isi Survei
- [ ] Login sebagai surveyor
- [ ] Klik "Isi Survei"
- [ ] Pilih kapal dari SPS (KM PELITA MARITIM atau TB KARTIKA 05)
- [ ] Isi form lengkap (lokasi, tanggal, biaya)
- [ ] Upload foto/dokumen
- [ ] Pilih tarif lokasi dari dropdown
- [ ] Hitung estimasi honorarium otomatis
- [ ] Simpan & terbitkan PDS
- [ ] Verify PDS muncul di daftar surat tugas
- [ ] Verify SPS linked dengan PDS

### Edit PDS
- [ ] Buka PDS existing (MV NUSANTARA EXPRESS)
- [ ] Edit detail survei
- [ ] Update biaya tiket/hotel
- [ ] Verify total honorarium recalculated
- [ ] Simpan perubahan

### Hapus Surat Tugas
- [ ] Buat surat tugas test
- [ ] Hapus surat tugas test
- [ ] Verify kwitansi & laporan terkait ikut terhapus

---

## 💰 Kwitansi Honorarium

### Lihat Data
- [ ] Tabel menampilkan 3 kwitansi
- [ ] 1 status "Sudah Dibayar" (hijau)
- [ ] 2 status "Belum Dibayar" (kuning)
- [ ] Total jumlah sesuai (Rp 16.700.000)

### Proses Pembayaran (Keuangan)
- [ ] Login sebagai Keuangan
- [ ] Buka kwitansi "TB SAMUDERA JAYA" (Rp 7.800.000)
- [ ] Ubah status ke "Sudah Dibayar"
- [ ] Simpan perubahan
- [ ] Verify total "Honor Belum Dibayar" berkurang
- [ ] Verify warna status berubah

### Detail Kwitansi
- [ ] View breakdown biaya (Tarif Dasar + Tiket + Hotel)
- [ ] View kategori transportasi
- [ ] View file tiket/hotel (jika ada)
- [ ] View link ke surat tugas terkait

### Edit Kwitansi
- [ ] Edit jumlah honorarium
- [ ] Edit tanggal bayar
- [ ] Edit catatan
- [ ] Verify perubahan tersimpan

---

## 📄 Laporan Survei

### Lihat Data
- [ ] Tabel menampilkan 2 laporan
- [ ] 1 status "Disetujui" (KM MUTIARA LAUT)
- [ ] 1 status "Terkirim" (TB SAMUDERA JAYA)
- [ ] Badge CITO muncul untuk laporan CITO

### Review & Approval (Admin)
- [ ] Login sebagai Admin
- [ ] Buka laporan "TB SAMUDERA JAYA" (status: Terkirim)
- [ ] Review detail laporan
- [ ] Klik "Setujui Laporan"
- [ ] Verify status berubah ke "Disetujui"
- [ ] Verify laporan muncul di dashboard summary

### Request Edit (Surveyor)
- [ ] Login sebagai Surveyor
- [ ] Coba edit laporan >24 jam (locked)
- [ ] Request edit approval
- [ ] Login sebagai Admin
- [ ] Approve request edit
- [ ] Login kembali sebagai Surveyor
- [ ] Verify laporan bisa di-edit

### Edit Laporan
- [ ] Edit hasil survei
- [ ] Edit nomor CDA/SO/WBS
- [ ] Update foto/dokumen
- [ ] Simpan perubahan

---

## 🖨️ Print & Export

### Surat Tugas Print
- [ ] Buka PDS "KM MUTIARA LAUT"
- [ ] Klik "Print Surat Tugas"
- [ ] Verify preview format resmi BKI:
  - [ ] Header 3 logo (Danantara, IDSurvey, BKI)
  - [ ] Nomor surat & tanggal
  - [ ] Detail 9 poin surat tugas
  - [ ] Tanda tangan Kepala Cabang
  - [ ] Tembusan & footer kontak
- [ ] Save as PDF berfungsi
- [ ] Print langsung berfungsi

### Buku Agenda Print
- [ ] Buka tab "Buku Agenda"
- [ ] Filter data (optional)
- [ ] Klik "Print Buku Agenda"
- [ ] Verify format tabel sesuai
- [ ] Export berfungsi

### Laporan Biaya Print
- [ ] Buka tab "Laporan Kwitansi"
- [ ] Klik "Print Laporan Biaya"
- [ ] Verify detail biaya lengkap
- [ ] Verify breakdown transportasi & hotel

### Excel Export
- [ ] Export Surat Tugas ke Excel
- [ ] Export Kwitansi ke Excel
- [ ] Export Laporan ke Excel
- [ ] Verify file downloaded & dapat dibuka

---

## ⚙️ Settings & Configuration

### Admin Settings
- [ ] Buka tab "Pengaturan"
- [ ] Edit Nama Kepala Cabang
- [ ] Edit NUP Kepala Cabang
- [ ] Edit Pembuat Daftar
- [ ] Edit Nama Cabang
- [ ] Upload signature Kepala Cabang
- [ ] Simpan perubahan
- [ ] Verify signature muncul di print preview

### Master Tarif Lokasi
- [ ] Lihat daftar tarif lokasi
- [ ] Tambah lokasi baru
- [ ] Edit tarif existing
- [ ] Hapus tarif
- [ ] Verify tarif muncul di dropdown form

### Master Tarif Grade
- [ ] Lihat daftar tarif grade
- [ ] Tambah grade baru
- [ ] Edit uang harian
- [ ] Hapus grade
- [ ] Verify grade muncul di dropdown form

---

## 🔄 Reset Data Demo

### Reset Functionality
- [ ] Login sebagai Admin
- [ ] Klik "Reset Data Demo"
- [ ] Masukkan password konfirmasi
- [ ] Confirm reset
- [ ] Verify data kembali ke kondisi default:
  - [ ] 5 Surat Tugas
  - [ ] 3 Kwitansi (1 paid, 2 unpaid)
  - [ ] 2 Laporan
  - [ ] User accounts tetap ada
- [ ] Verify dashboard summary update
- [ ] Verify kalender update

---

## 🎨 UI/UX Testing

### Theme Toggle
- [ ] Toggle Dark Mode
- [ ] Toggle Light Mode
- [ ] Verify theme tersimpan setelah refresh

### Responsive Design
- [ ] Desktop view (>1024px)
- [ ] Tablet view (768-1024px)
- [ ] Mobile view (<768px)
- [ ] Mobile menu berfungsi
- [ ] Scroll horizontal tabel berfungsi

### Form Validation
- [ ] Required field validation
- [ ] Email format validation
- [ ] Number format validation
- [ ] Date validation
- [ ] File upload validation (max size, format)

### Loading States
- [ ] Loading spinner saat data fetch
- [ ] Disabled button saat submit
- [ ] Success toast notification
- [ ] Error toast notification

---

## 🐛 Error Handling

### Network Errors
- [ ] Disconnect internet → verify graceful degradation
- [ ] Reconnect → verify auto-sync

### Data Integrity
- [ ] Invalid data input ditolak
- [ ] Orphaned data (kwitansi tanpa surat tugas) tidak crash
- [ ] Duplicate data handling

### Browser Compatibility
- [ ] Chrome/Edge (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest, if available)

---

## 🔒 Security & Permissions

### Role-Based Access
- [ ] Surveyor tidak bisa akses User Management
- [ ] Surveyor tidak bisa delete PDS orang lain
- [ ] Finance hanya lihat laporan & kwitansi
- [ ] Finance tidak bisa edit surat tugas
- [ ] Monitor role hanya bisa view (read-only)

### Password Protection
- [ ] Change password berfungsi
- [ ] Reset password berfungsi
- [ ] Password confirmation required untuk sensitive actions

---

## ✅ Final Checklist

- [ ] Semua scenario dummy data berfungsi
- [ ] Tidak ada console error
- [ ] Tidak ada broken image/link
- [ ] Semua button responsive
- [ ] Semua modal bisa ditutup
- [ ] Data persistence setelah refresh
- [ ] Export/Print berfungsi semua
- [ ] Reset data berfungsi sempurna

---

## 📝 Testing Notes

**Tested By**: _____________________  
**Date**: _____________________  
**Browser**: _____________________  
**Issues Found**: _____________________

---

## 🚨 Known Issues

_List any known issues or limitations here_

---

**Version**: 1.1.0  
**Last Updated**: 23 Agustus 2026  
**PT Biro Klasifikasi Indonesia (Persero)**
