# 📁 Panduan Setup Integrasi Google Drive — Sistem Surat Tugas BKI

Fitur ini memungkinkan seluruh berkas lampiran (**Foto Dokumentasi**, **Bukti Visit & Selfie**, **Tiket Transportasi**, dan **Kwitansi Hotel**) disimpan langsung ke **Google Drive** secara otomatis, terstruktur per folder Tahun, Bulan, Nomor Surat / Agenda, dan Nama Kapal.

---

## ⚡ Langkah Mudah Setup (Kurang dari 2 Menit):

### 1. Buka Google Apps Script
- Kunjungi: [https://script.google.com/](https://script.google.com/)
- Pastikan login dengan akun Google (Gmail biasa 15GB gratis atau Google Workspace BKI).

### 2. Buat Proyek Baru
- Klik tombol **"New project"** (Proyek baru).
- Beri judul proyek di pojok kiri atas, misal: `BKI Surat Drive API`.

### 3. Salin & Tempel Kode Backend
- Hapus semua kode default `myFunction()` di editor `Code.gs`.
- Salin seluruh isi berkas [google-apps-script/Code.gs](file:///d:/3.%20Dokumen%20Pribadi%20Pena%20Pras/Pras/Project%20BKI/Suratbki/google-apps-script/Code.gs) dan tempelkan ke editor Google Apps Script.

### 4. Deploy sebagai Web App
- Klik tombol biru **"Deploy"** (Terapkan) di pojok kanan atas > pilih **"New deployment"** (Penerapan baru).
- Klik ikon roda gigi (*Select type*) > pilih **"Web app"** (Aplikasi web).
- Konfigurasikan:
  - **Description:** `BKI Drive Upload v1`
  - **Execute as:** `Me (Akun Google Anda)`
  - **Who has access:** `Anyone` *(Siapa saja yang memiliki link)*
- Klik **"Deploy"**.

### 5. Otorisasi Akses Google
- Klik **"Authorize access"** (Izinkan akses).
- Pilih akun Google Anda.
- Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** (*Lanjutan*) > klik **Go to BKI Surat Drive API (unsafe)**.
- Klik **"Allow"** (Izinkan).

### 6. Salin Web App URL ke Pengaturan Aplikasi
- Salin **Web app URL** yang muncul (format: `https://script.google.com/macros/s/AKfycb.../exec`).
- Buka aplikasi **Surat BKI** > Menu **Pengaturan (Settings)**.
- Gulir ke seksi **"Penyimpanan Berkas Google Drive"**.
- Aktifkan toggle **"Aktifkan Penyimpanan Google Drive"**.
- Tempelkan URL pada kolom **Google Apps Script Web App URL**.
- Klik tombol **"Tes Koneksi Drive"** untuk memastikan koneksi aktif (hijau) 🟢.
- Klik **"Simpan"**.

---

## 📂 Struktur Folder Otomatis di Google Drive:

```text
📁 BKI_DOKUMEN_SURAT (Root Folder)
  └── 📁 2026 (Tahun)
      └── 📁 08-Agustus (Bulan)
          └── 📁 SP-0012_TB_TRANSPOWER_123 (No Agenda & Nama Kapal)
              ├── 📁 1_Foto_Dokumentasi
              ├── 📁 2_Bukti_Visit_Selfie
              ├── 📁 3_Tiket_Transport
              └── 📁 4_Kwitansi_Hotel
```

---

## 🛡️ Keunggulan Sistem Ini:
1. **Zero Server Maintenance**: Berjalan 100% di serverless Google Drive gratis.
2. **Tanpa Perlu Login Setiap Surveyor**: Surveyor di lapangan langsung upload tanpa perlu popup login Google.
3. **Database Ringan**: Database Supabase & LocalStorage hanya menyimpan URL dan metadata beberapa byte.
4. **Fallback Otomatis**: Jika internet/Google Drive belum dikonfigurasi, sistem otomatis menggunakan Supabase Storage / mode lokal tanpa menghentikan pekerjaan surveyor.
