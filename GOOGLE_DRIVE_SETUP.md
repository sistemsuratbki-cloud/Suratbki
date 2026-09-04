# 📊 Panduan Lengkap Integrasi Google Workspace: Google Sheets & Google Drive
### Sistem Administrasi Surat Tugas, Kwitansi & Laporan BKI Cabang Pontianak

Fitur ini mengintegrasikan **Google Workspace (100% Gratis & Serverless)** untuk sistem BKI:
1. **Google Sheets sebagai Database Cloud Utama**: Menyimpan seluruh data operasional (Surat Tugas SPS & PDS, Kwitansi Honor, Laporan Survei, Master Kapal, Tarif, Pengaturan, Akun Pengguna, dan Data Visit).
2. **Google Drive sebagai Penyimpanan Lampiran Berkas**: Menyimpan seluruh berkas fisik (PDF Tiket Pesawat/Kapal, Kwitansi Hotel/Penginapan, Foto Dokumentasi Survei, dan Foto Selfie Visit Lapangan).

---

## ⚡ Langkah Mudah Setup / Update (Hanya 1 Menit)

Jika Anda sudah memiliki Google Apps Script Web App sebelumnya (`sistemsuratbki@gmail.com`), Anda hanya perlu memperbarui kodenya ke versi baru ini.

### 1. Buka Google Apps Script
- Kunjungi: [https://script.google.com/](https://script.google.com/)
- Pastikan login dengan akun Google Anda: **`sistemsuratbki@gmail.com`**.
- Buka proyek yang sudah dibuat (misal: `BKI Drive Service` atau `BKI Surat Drive API`).

### 2. Perbarui Kode di `Code.gs`
- Hapus semua isi kode yang ada di tab `Code.gs`.
- Salin seluruh isi berkas:  
  📁 [`google-apps-script/Code.gs`](file:///d:/3.%20Dokumen%20Pribadi%20Pena%20Pras/Pras/Project%20BKI/Suratbki/google-apps-script/Code.gs)
- Tempelkan (Paste) ke editor `Code.gs` di Google Apps Script.
- Klik ikon **Simpan** (ikon disket 💾 atau tekan `Ctrl + S`).

### 3. Deploy Versi Baru (New Version)
> ⚠️ **PENTING**: Setiap ada perubahan kode, wajib membuat **New Version** agar URL Web App menjalankan kode terbaru!

1. Klik tombol biru **"Deploy"** (Terapkan) di pojok kanan atas > pilih **"Manage deployments"** (Kelola penerapan).
2. Klik ikon **Pensil** (Edit) pada penerapan yang aktif.
3. Pada dropdown **Version** (Versi), pilih **"New version"** (Versi Baru).
4. Pastikan:
   - **Execute as:** `Me (sistemsuratbki@gmail.com)`
   - **Who has access:** `Anyone` (Siapa saja yang memiliki link)
5. Klik tombol **"Deploy"** (Terapkan).
6. Jika Google meminta otorisasi ulang:
   - Klik **Authorize access** > Pilih akun Google > Klik **Advanced** (*Lanjutan*) > Klik **Go to BKI Surat Drive API (unsafe)** > Klik **Allow** (*Izinkan*).
7. Salin **Web app URL** yang muncul (misalnya: `https://script.google.com/macros/s/AKfycbxMYYfKw5rwpj_G1HoGh4lIXQxh6KI8mMZo7SEBWDQHTzoQbbGou1e8I58K3yer5xrSmg/exec`).

---

## 🚀 Pengaturan di Aplikasi Web BKI

1. Buka aplikasi web Surat BKI di browser (`http://localhost:3000/` atau domain produksi Anda).
2. Masuk ke menu **Pengaturan** (ikon gerigi di navigasi atas).
3. Gulir ke bagian **"Penyimpanan Berkas Google Drive & Database Google Sheets"**.
4. Pastikan toggle **"Aktifkan Penyimpanan Google Drive & Database Google Sheets"** sudah menyala (hijau).
5. Masukkan / periksa **Google Apps Script Web App URL**.
6. Klik tombol **"Tes Koneksi Drive & Sheets"**:
   - Sistem akan menguji koneksi. Jika berhasil, akan muncul notifikasi sukses beserta kapasitas penyimpanan akun Google Anda.
7. Klik tombol hijau **"Kirim Data ke Google Sheets"**:
   - Sistem akan secara otomatis mengunggah seluruh data lokal saat ini (8 Surat Tugas, 3 Kwitansi, 2 Laporan, 627 Master Kapal, 44 Tarif, dll) ke Google Spreadsheet.
   - Spreadsheet bernama **`DATABASE_SURAT_BKI_PONTIANAK`** akan otomatis dibuat di Google Drive Anda dengan tab rapi untuk setiap tabel.
   - Tautan langsung ke Google Spreadsheet akan muncul di aplikasi sehingga Anda bisa membukanya kapan saja!
8. Klik **"Simpan Pengaturan"**.

---

## 🗄️ Struktur Database di Google Sheets

Spreadsheet bernama **`DATABASE_SURAT_BKI_PONTIANAK`** akan berisi tab-tab berikut:
1. `surat_tugas`: Data Surat Perintah Survei (SPS) dan Perjalanan Dinas (PDS), lengkap dengan nomor, tanggal, status, kapal, dan surveyor.
2. `kwitansi_honor`: Data kwitansi honor surveyor, rincian biaya tiket, hotel, uang harian, dan total honor.
3. `laporan_survei`: Laporan teknis survei beserta kesimpulan, checklist kondisi kapal, dan rekomendasi surveyor.
4. `master_kapal`: 627 data registrasi kapal (Nama Kapal, No BKI, Tipe, Gross Tonnage, Pemilik/Agen).
5. `tariffs` & `grade_tariffs`: Standar biaya survei, transport, dan honor harian per grade surveyor.
6. `admin_settings`: Konfigurasi kop surat, nomor agenda, pejabat penandatangan, dan preferensi sistem.
7. `users`: Akun pengguna dan hak akses (Admin, Surveyor, Staff).
8. `visit_survei`: Data check-in / visit surveyor di lokasi kapal.

Setiap baris dilengkapi kolom ringkasan manusiawi (`ID`, `NOMOR / NAMA`, `STATUS / DETAIL`, `PETUGAS / USER`) serta kolom `RAW_DATA` (JSON lengkap) yang menjamin data tidak akan pernah terpotong atau korup.

---

## 📁 Struktur Penyimpanan Lampiran di Google Drive

Semua berkas lampiran otomatis disimpan ke Google Drive dengan susunan folder yang rapi:
```text
📁 BKI_DOKUMEN_SURAT (Folder Utama)
  └── 📁 2026 (Tahun)
      └── 📁 08-Agustus (Bulan)
          └── 📁 SP-0012_TB_TRANSPOWER_123 (No Agenda & Nama Kapal)
              ├── 📁 1_Foto_Dokumentasi (Foto kondisi lambung, mesin, deck)
              ├── 📁 2_Bukti_Visit_Selfie (Foto selfie surveyor di lokasi)
              ├── 📁 3_Tiket_Transport (PDF tiket pesawat, boarding pass, kapal)
              └── 📁 4_Kwitansi_Hotel (PDF / Foto kwitansi penginapan)
```

---

## 🛡️ Keunggulan Arsitektur Ini
- **Bebas Ketergantungan Supabase**: Tidak perlu khawatir kuota gratis Supabase habis atau database dinonaktifkan jika lama tidak diakses.
- **Transparan & Mudah Diaudit**: Manajemen BKI dapat langsung membuka spreadsheet di Google Sheets dan folder di Google Drive tanpa perlu membuka database database teknis.
- **Offline Resilient**: Bila koneksi internet lambat atau terputus di lapangan, aplikasi tetap berfungsi normal menggunakan LocalStorage, dan otomatis sinkron saat terhubung kembali.
- **Zero Cost**: Memanfaatkan kuota 15 GB Google Drive & Google Sheets gratis bawaan akun Google.
