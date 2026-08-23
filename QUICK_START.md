# 🚀 Quick Start Guide - Sistem Surat Tugas BKI

Panduan cepat untuk mulai menggunakan aplikasi dalam 5 menit!

---

## ⚡ Langkah Cepat

### 1️⃣ Jalankan Aplikasi
```bash
npm run dev
```
Buka browser: **http://localhost:3001** (atau port yang muncul di terminal)

### 2️⃣ Login Pertama Kali

**Rekomendasi**: Mulai dengan akun Admin untuk melihat semua fitur

```
Username: admin
Password: admin123
```

### 3️⃣ Jelajahi Data Demo

Setelah login, Anda akan langsung melihat:
- 📅 **Kalender** dengan 5 surat tugas
- 📊 **Dashboard Ringkasan** di atas kalender
- 💰 **Honor Belum Dibayar**: Rp 13.700.000

---

## 🎯 Fitur Utama & Cara Mengaksesnya

### 📋 Lihat Semua Surat Tugas
**Sidebar** → Klik **"Surat Tugas (PDS)"**

Anda akan melihat tabel dengan:
- ✅ 3 Surat Tugas selesai
- ⏳ 2 Surat Persetujuan Survei (SPS) menunggu

**Coba**: Klik salah satu surat untuk melihat detail & edit

---

### 💰 Kelola Kwitansi Honorarium
**Sidebar** → Klik **"Laporan Perjalanan Dinas (Kwitansi)"**

Anda akan melihat:
- 1 kwitansi sudah dibayar (✅ hijau)
- 2 kwitansi belum dibayar (⏳ kuning)

**Coba**: 
1. Klik salah satu kwitansi belum dibayar
2. Ubah status menjadi "Sudah Dibayar"
3. Lihat total di dashboard berubah

---

### 📄 Laporan Survei
**Sidebar** → Klik **"Laporan Survei"**

Anda akan melihat 2 laporan dengan status berbeda

**Coba**: Klik tombol **"Cetak PDF"** untuk preview surat tugas resmi

---

### ➕ Buat Surat Tugas Baru

#### Cara 1: Buat SPS (Admin Input)
1. Klik **"+ SPS Baru"** di halaman Surat Tugas
2. Isi form:
   - Nama Kapal
   - Jenis Survei
   - Surveyor
   - Lokasi
3. Klik **"Simpan SPS"**

#### Cara 2: Surveyor Isi Survei
1. Login sebagai surveyor (username: `bone`, password: `password123`)
2. Klik **"+ Isi Survei"**
3. Pilih kapal dari SPS yang ada
4. Isi detail survei
5. Klik **"Simpan & Terbitkan PDS"**

---

### 🖨️ Cetak Dokumen Resmi

**Format yang tersedia**:
1. ✅ Surat Tugas PDS (Format BKI Official)
2. ✅ Buku Agenda
3. ✅ Laporan Biaya Perjalanan Dinas

**Cara cetak**:
- Klik tombol **"Print"** di halaman masing-masing
- Dialog print browser akan muncul
- Pilih "Save as PDF" atau langsung print

---

### 👥 Ganti Role/User

**Ingin coba fitur role lain?**

1. Klik tombol **Logout** (icon 🚪 di kanan atas)
2. Login dengan akun lain:

| Role | Username | Password |
|------|----------|----------|
| Surveyor | `bone` | `password123` |
| Keuangan | `finance` | `password123` |
| Kepala Cabang | `muhson` | `password123` |

---

## 🔄 Reset Data Demo

**Kapan perlu reset?**
- Setelah banyak testing
- Sebelum demo/presentasi
- Data sudah berantakan

**Cara reset**:
1. Login sebagai Admin
2. Klik tombol **"Reset Data Demo"** di header (kanan atas)
3. Masukkan password Anda
4. Konfirmasi

Data akan kembali ke kondisi default (5 ST, 3 Kwitansi, 2 Laporan)

---

## 💡 Tips Pro

### Alur Kerja Standar

```
1. Admin input SPS (Surat Persetujuan Survei)
   ↓
2. Admin kirim paraf ke pemohon
   ↓
3. Surveyor eksekusi survei & isi data
   ↓
4. Surveyor terbitkan PDS (Perjalanan Dinas Surveyor)
   ↓
5. Admin review & ACC laporan
   ↓
6. Keuangan proses pembayaran honorarium
```

### Shortcut Keyboard

- **Tab Kalender**: Klik tanggal untuk lihat tugas hari itu
- **Klik kanan pada tabel**: Copy/Export (tergantung browser)
- **Ctrl + P**: Print preview (saat modal print terbuka)

### Filter Data

Semua tabel memiliki:
- 🔍 **Search bar** - cari berdasarkan nama kapal, surveyor, lokasi
- 📅 **Filter tanggal** - tampilkan data pada rentang tertentu
- 🏷️ **Filter status** - tampilkan hanya status tertentu

---

## 🎓 Latihan Hands-On

### Latihan 1: Proses Pembayaran (5 menit)
1. Login sebagai **Finance** (`finance` / `password123`)
2. Lihat kwitansi belum dibayar
3. Proses pembayaran untuk "TB SAMUDERA JAYA"
4. Verifikasi total belum dibayar berkurang

### Latihan 2: Alur Survei Lengkap (10 menit)
1. Login sebagai **Admin**
2. Buat SPS baru untuk kapal "KM TEST 01"
3. Logout & login sebagai **Surveyor** (`bone`)
4. Isi survei untuk kapal "KM TEST 01"
5. Terbitkan PDS
6. Logout & login kembali sebagai **Admin**
7. Review & ACC laporan
8. Lihat laporan muncul di tab "Laporan Survei"

### Latihan 3: Cetak Dokumen (3 menit)
1. Buka halaman Surat Tugas
2. Pilih surat dengan status "Selesai"
3. Klik tombol **"Print Surat Tugas"**
4. Lihat preview format resmi BKI
5. Save as PDF

---

## 🆘 Troubleshooting Cepat

### Port sudah digunakan
```bash
# Matikan proses lain di port 3000
# Atau Vite akan otomatis pindah ke port lain (3001, 3002, dst)
```

### Data tidak muncul
```bash
# Reset localStorage
# Buka Console (F12) dan jalankan:
localStorage.clear();
window.location.reload();
```

### HMR/Hot Reload tidak jalan
```bash
# Restart dev server
# Ctrl + C (stop)
npm run dev
```

### Tampilan berantakan
```bash
# Clear cache browser
# Ctrl + Shift + R (hard refresh)
```

---

## 📚 Next Steps

Setelah familiar dengan fitur dasar:

1. 📖 Baca [`DATA_DUMMY_INFO.md`](./DATA_DUMMY_INFO.md) - Detail skenario testing
2. 📖 Baca [`README.md`](./README.md) - Dokumentasi lengkap
3. 🔧 Explore tab **Pengaturan** - Customize sistem
4. 👥 Explore **User Management** - Kelola akun surveyor
5. 💰 Explore **Master Tarif** - Kelola tarif lokasi & grade

---

## 🎉 Selamat Mencoba!

Jika ada pertanyaan atau menemukan bug, silakan buat issue di GitHub repository.

**Support**: sistemsuratbki@gmail.com  
**Version**: 1.0  
**PT Biro Klasifikasi Indonesia (Persero)**
