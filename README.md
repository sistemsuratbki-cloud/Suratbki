# Sistem Informasi Surat Tugas Survei Kapal BKI (IDSurvey)

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![License](https://img.shields.io/badge/BKI-Official-003366?style=flat-square)](#)

Aplikasi web manajemen digital untuk pengelolaan, pengisian, dan pencetakan resmi **Surat Tugas Survei Kapal**, **Laporan Kelaiklautan**, serta **Kwitansi Honorarium Surveyor** PT Biro Klasifikasi Indonesia (Persero) / IDSurvey.

---

## 🌟 Fitur Utama

- **Tampilan Resmi Surat Tugas (Standard BKI Specimen)**:
  - Header Kop 3 Logo berdampingan (**Danantara Indonesia**, **IDSurvey**, dan **bki**).
  - Judul & Nomor Surat Tugas terpusat.
  - Penataan rincian tugas poin 1 s/d 9 (Nama, Pangkat, Jabatan, Lokasi, Keperluan/Kapal, Tanggal Berangkat & Kembali, Sarana Transportasi, Keterangan Pembiayaan).
  - Tanda tangan Kepala Cabang & NUP resmi.
  - Tembusan & Footer kontak cabang (Telepon, Fax, Email, Website IDSurvey).

- **Cetak PDF Presisi A4 Single Page**:
  - Dioptimalkan khusus untuk perintah cetak browser (`window.print()`).
  - Latar belakang antarmuka web disembunyikan otomatis saat mencetak sehingga hanya lembar Surat Tugas bersih yang dirender.
  - Ketajaman warna grafik & logo terjaga (`print-color-adjust: exact`).

- **Otomatisasi Penandatangan dari Pengaturan Admin**:
  - Nama Kepala Cabang dan NUP dikelola secara terpusat di tab **Pengaturan Admin**.
  - Form pengisian otomatis menarik data penandatangan tanpa perlu diketik ulang secara manual oleh surveyor.

- **Manajemen Honorarium & Surcharge CITO**:
  - Perhitungan honorarium otomatis berdasarkan tarif lokasi pelabuhan/galangan.
  - Dukungan surcharge tarif CITO / Hari Libur (+50%).
  - Reimbursment biaya tiket transportasi (Pesawat, Speedboat, Mobil Dinas) beserta upload berkas foto/PDF.

- **Multi-Role & Akses Pengguna**:
  - **Admin**: Akses penuh ke seluruh fitur, manajemen user, reset data demo, dan pengaturan penandatangan.
  - **Surveyor**: Pengisian laporan survei kapal, tiket transportasi, dan pencetakan Surat Tugas.
  - **Finance**: Pengelolaan dan verifikasi pembayaran kwitansi honorarium.

---

## 💻 Prasyarat Sistem

Sebelum menjalankan project di komputer lokal, pastikan Anda telah menginstal:

- [Node.js](https://nodejs.org/) (Versi **18.x** atau **20.x** direkomendasikan)
- [npm](https://www.npmjs.com/) (Bawaan Node.js) atau `pnpm` / `yarn`
- Git

---

## 🚀 Cara Menjalankan di Komputer Lokal (Local Development)

1. **Clone Repository GitHub**:
   ```bash
   git clone https://github.com/Prasetya1721/Suratbki.git
   ```

2. **Masuk ke Direktori Project**:
   ```bash
   cd Suratbki
   ```

3. **Install Seluruh Dependensi**:
   ```bash
   npm install
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```

5. **Buka di Browser**:
   Buka URL lokal yang tampil di terminal, biasanya: `http://localhost:3000` atau `http://localhost:5173`.

---

## 🔑 Akun Demo (Default Login)

Sistem menyediakan akun percontohan untuk pengujian multi-role:

| Role | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `@admin` | `admin` | Pengaturan sistem, manajemen user, reset demo, cetak Surat Tugas |
| **Surveyor** | `@surveyor` | `surveyor` | Pengisian laporan survei, upload tiket, cetak Surat Tugas |
| **Finance** | `@finance` | `finance` | Verifikasi & pembayaran kwitansi honorarium |

---

## 🌐 Panduan Deployment (Publikasi Web)

Aplikasi ini dibangun menggunakan **Vite + React (SPA)** dan dapat dideploy dengan sangat mudah ke berbagai layanan cloud hosting gratis maupun berbayar.

### 1. Deploy ke Vercel (Direkomendasikan)

1. Buka [Vercel](https://vercel.com/) dan buat akun / login dengan akun GitHub Anda.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repository **`Prasetya1721/Suratbki`**.
4. Pengaturan build otomatis terdeteksi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Klik **"Deploy"**. Dalam hitungan detik, aplikasi web Anda aktif dengan domain HTTPS gratis!

---

### 2. Deploy ke Netlify

1. Login ke [Netlify](https://www.netlify.com/).
2. Klik **"Add new site"** -> **"Import an existing project"**.
3. Hubungkan ke GitHub dan pilih **`Prasetya1721/Suratbki`**.
4. Masukkan konfigurasi berikut:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Klik **"Deploy site"**.

---

### 3. Build Production Manual (Nginx / Apache / IIS)

Jika Anda ingin meng-host aplikasi di web server milik instansi/perusahaan sendiri:

1. Jalankan perintah build:
   ```bash
   npm run build
   ```
2. Seluruh file produksi yang siap pakai akan berada di folder **`dist/`**.
3. Salin seluruh isi folder `dist/` ke web root server Anda (misalnya `/var/www/html/` pada Nginx/Apache).

---

## 📁 Struktur Direktori Project

```
Suratbki/
├── public/                  # Asset logo SVG publik
│   ├── bki-logo.svg
│   └── danantara-logo.svg
├── src/
│   ├── components/          # Komponen UI
│   │   ├── BKILogo.jsx
│   │   ├── DanantaraLogo.jsx
│   │   ├── IDSurveyLogo.jsx
│   │   ├── SuratTugasPrintModal.jsx   # Tampilan Cetak Resmi ST
│   │   ├── SuratTugasModal.jsx        # Form Input ST
│   │   ├── DayDetailModal.jsx         # Detail Kalender & Form Survei
│   │   ├── SettingsTab.jsx            # Pengaturan Penandatangan Admin
│   │   └── ...
│   ├── context/             # State Management (React Context)
│   │   ├── AuthContext.jsx
│   │   └── DataContext.jsx  # Data Surat Tugas, Kwitansi & Admin Settings
│   ├── utils/               # Formatter tanggal, rupiah & tarif
│   ├── App.jsx              # Routing & Layout Utama
│   ├── index.css            # Custom Styling & @media print styles
│   └── main.jsx             # React Mounting Entry Point
├── package.json
├── vite.config.js
└── README.md
```

---

## 📄 Lisensi & Hak Cipta

© 2026 **PT Biro Klasifikasi Indonesia (Persero)** — IDSurvey / Badan Pengelola Investasi Daya Anagata Nusantara (Danantara Indonesia).
