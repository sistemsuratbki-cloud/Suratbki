# Data Dummy - Sistem Informasi Surat Tugas BKI

## 📋 Deskripsi

Aplikasi ini dilengkapi dengan **data dummy default** yang akan otomatis dimuat saat pertama kali dijalankan atau setelah direset. Data dummy ini berguna untuk:

- **Testing & Demo**: Memudahkan presentasi dan testing fitur aplikasi
- **Onboarding**: Membantu pengguna baru memahami alur kerja sistem
- **Development**: Mempercepat proses pengembangan fitur baru

## 🎯 Data Dummy yang Tersedia

### 1. Surat Tugas (5 item)

| No | Nomor Surat | Jenis | Kapal | Surveyor | Pangkat | Lokasi | Status |
|----|-------------|-------|-------|----------|---------|--------|--------|
| 1 | A 0    /SV.245/PK/KI-26 | PDS - Annual Survey | KM MUTIARA LAUT | Alfian Bone Putra | GRADE 6 A | Pontianak | Selesai (ACC) |
| 2 | A 0    /SV.246/PK/KI-26 | PDS - Docking Survey | TB SAMUDERA JAYA | Sandi Nandarianto | GRADE 5 C | Batam | Selesai (ACC) |
| 3 | A 0    /SV.247/PK/KI-26 | PDS - Intermediate | MV NUSANTARA EXPRESS | Andre Guntur | GRADE 6 A | Jakarta | Berjalan |
| 4 | - | SPS - Renewal Survey | KM PELITA MARITIM | Septian Aji | GRADE 5 C | Surabaya | Menunggu Survei |
| 5 | - | SPS - Annual Survey | TB KARTIKA 05 | Alfian Bone Putra | GRADE 6 A | Pontianak | Menunggu Survei |

### 2. Kwitansi Honorarium (3 item)

| No | Nama Penerima | Kapal | Lokasi | Tarif Dasar | Biaya Tiket | Total | Status |
|----|---------------|-------|--------|-------------|-------------|-------|--------|
| 1 | Alfian Bone Putra | KM MUTIARA LAUT | Pontianak | Rp 3.000.000 | Rp 0 | Rp 3.000.000 | Sudah Dibayar |
| 2 | Sandi Nandarianto | TB SAMUDERA JAYA | Batam | Rp 4.500.000 | Rp 3.300.000 | Rp 7.800.000 | Belum Dibayar |
| 3 | Andre Guntur | MV NUSANTARA EXPRESS | Jakarta | Rp 3.500.000 | Rp 2.400.000 | Rp 5.900.000 | Belum Dibayar |

**Total Honorarium**: Rp 16.700.000  
**Total Belum Dibayar**: Rp 13.700.000

### 3. Laporan Survei (2 item)

| No | Kapal | Surveyor | Lokasi | Jenis Survei | Status | CITO |
|----|-------|----------|--------|--------------|--------|------|
| 1 | KM MUTIARA LAUT | Alfian Bone Putra | Pontianak | Annual Survey | Disetujui | Tidak |
| 2 | TB SAMUDERA JAYA | Sandi Nandarianto | Batam | Docking Survey | Terkirim | Ya |

## 🔄 Cara Reset ke Data Dummy Default

### Via Aplikasi (Recommended)

1. Login sebagai **Admin**, **Kepala Cabang**, atau **Developer**
2. Klik tombol **"Reset Data Demo"** di pojok kanan atas header
3. Konfirmasi dengan memasukkan password Anda
4. Data akan direset ke kondisi default

### Via Browser Console (Advanced)

Buka Console Browser (F12) dan jalankan:

```javascript
// Hapus semua data
localStorage.clear();

// Reload aplikasi
window.location.reload();
```

## 🔐 Akses Reset Data

Tombol **"Reset Data Demo"** hanya tersedia untuk:

- ✅ **Developer** (username: `admin`)
- ✅ **Admin** (username: `renza`)
- ✅ **Kepala Cabang** (username: `muhson`)

Role lain (Surveyor, Keuangan) tidak memiliki akses reset data.

## 🎨 Skenario Testing yang Tersedia

### Skenario 1: Alur Lengkap PDS (Selesai)
**Kapal**: KM MUTIARA LAUT  
**Status**: Selesai & ACC  
✅ Surat Tugas PDS sudah terbit  
✅ Kwitansi Honor sudah dibuat  
✅ Laporan Survei sudah disetujui  
✅ Pembayaran honorarium selesai  

**Use Case**: Testing review data yang sudah selesai, export laporan, cetak dokumen

### Skenario 2: Alur PDS dengan CITO (Belum Bayar)
**Kapal**: TB SAMUDERA JAYA  
**Status**: Selesai & ACC, Menunggu Pembayaran  
✅ Surat Tugas PDS sudah terbit  
✅ Kwitansi Honor sudah dibuat (Rp 7.800.000)  
✅ Laporan Survei terkirim  
⏳ Pembayaran honorarium belum diproses  

**Use Case**: Testing proses pembayaran oleh staff keuangan, surcharge CITO

### Skenario 3: Alur PDS Sedang Berjalan
**Kapal**: MV NUSANTARA EXPRESS  
**Status**: Survei sedang berlangsung, belum ACC  
✅ Surat Tugas PDS sudah terbit  
⏳ Kwitansi Honor menunggu pembayaran  
⏳ Laporan Survei belum disetujui admin  

**Use Case**: Testing update status survei, approval admin, edit data

### Skenario 4: Alur SPS (Paraf Sudah Dikirim)
**Kapal**: KM PELITA MARITIM  
**Status**: Menunggu Survei  
✅ SPS sudah dibuat admin  
✅ Paraf sudah dikirim ke pemohon  
⏳ Menunggu surveyor eksekusi survei  
⏳ PDS belum diterbitkan  

**Use Case**: Testing eksekusi survei oleh surveyor, terbitkan PDS dari SPS

### Skenario 5: Alur SPS Baru
**Kapal**: TB KARTIKA 05  
**Status**: Menunggu Survei  
✅ SPS sudah dibuat admin  
⏳ Paraf belum dikirim  
⏳ Menunggu persetujuan admin  

**Use Case**: Testing approval SPS, kirim paraf ke pemohon

## 💡 Tips Penggunaan

1. **Sebelum Demo/Presentasi**: Selalu reset data ke default untuk konsistensi
2. **Setelah Training**: Reset data agar user baru bisa berlatih dengan data bersih
3. **Saat Development**: Reset jika data test sudah terlalu berantakan
4. **Backup Manual**: Gunakan fitur export Excel sebelum reset jika perlu simpan data

## 📝 Catatan Penting

⚠️ **Data dummy ini bersifat lokal** dan disimpan di `localStorage` browser. Jika Anda menggunakan browser berbeda atau mode incognito, data tidak akan tersinkron.

⚠️ **Reset akan menghapus SEMUA data** yang ada saat ini dan menggantinya dengan data dummy default. Pastikan backup data penting sebelum reset.

✅ **Data user tidak terpengaruh** - Akun user (admin, surveyor, finance, dll) tetap ada setelah reset.

## 🔗 Informasi Teknis

**File terkait**:
- `src/utils/initialData.js` - Definisi data dummy
- `src/context/DataContext.jsx` - Logic reset dan load data
- `src/components/Header.jsx` - UI tombol reset

**LocalStorage Keys**:
- `st_surat_tugas` - Data surat tugas
- `st_kwitansi_honor` - Data kwitansi
- `st_laporan_survei` - Data laporan
- `st_tariffs` - Data tarif lokasi
- `st_grade_tariffs` - Data tarif grade

---

**Versi**: 1.0  
**Terakhir diperbarui**: 23 Agustus 2026  
**PT Biro Klasifikasi Indonesia (Persero) - IDSurvey**
