# Product Requirements Document (PRD)
## Dasbor Sistem Penyuratan — Surat Tugas, Kwitansi Honor, dan Laporan Survei

**Versi:** 1.0
**Tanggal:** 10 Agustus 2026
**Status:** Draf

---

## 1. Latar Belakang & Tujuan

Proses administrasi tugas lapangan (surat tugas, pembayaran honor petugas, dan laporan hasil survei) selama ini dikelola secara manual/terpisah, sehingga sulit untuk memantau siapa yang sedang bertugas, kapan, dan apakah honor serta laporannya sudah selesai diproses.

Dasbor ini dibuat untuk menyatukan tiga proses tersebut dalam satu tampilan, dengan kalender sebagai pusat pemantauan harian, sehingga pengelola dapat dengan cepat melihat beban tugas per hari dan status administrasi terkait tanpa membuka banyak dokumen.

**Tujuan utama:**
- Mempercepat pencatatan surat tugas, kwitansi honor, dan laporan survei.
- Memberi gambaran visual (kalender) atas jadwal tugas per hari.
- Memantau status pembayaran honor dan status laporan agar tidak ada yang terlewat.

## 2. Target Pengguna

| Peran | Kebutuhan Utama |
|---|---|
| Admin/pengelola penyuratan | Membuat & memantau surat tugas, memastikan honor dibayar, memantau laporan masuk |
| Petugas survei/lapangan | (Tidak langsung mengakses sistem saat ini — datanya dicatat oleh admin) |

> Catatan: versi ini dirancang untuk **satu pengguna admin** yang mengelola seluruh data (single-user).

## 3. Lingkup Produk (Scope)

### 3.1 Fitur Inti (In Scope — sudah tersedia di v1.0)

1. **Kalender Tugas**
   - Tampilan bulanan dengan navigasi bulan sebelumnya/berikutnya dan tombol "Hari ini".
   - Setiap tanggal menampilkan indikator visual (titik warna) untuk tugas yang berlangsung pada hari itu, warna mengikuti status tugas.
   - Klik tanggal menampilkan daftar tugas pada hari tersebut (nomor surat, perihal, lokasi, petugas, status).

2. **Surat Tugas**
   - Catat: nomor surat, perihal/judul tugas, nama petugas, lokasi, tanggal mulai & selesai, status (Belum Mulai/Berjalan/Selesai), catatan.
   - Tambah, ubah, dan hapus data surat tugas.
   - Daftar surat tugas dalam bentuk tabel dengan status berwarna.

3. **Kwitansi Honor**
   - Catat: penerima, surat tugas terkait, jumlah honor (Rupiah), tanggal bayar, status (Belum Dibayar/Sudah Dibayar), catatan.
   - Tambah, ubah, dan hapus data kwitansi.
   - Terhubung ke surat tugas terkait (opsional).

4. **Laporan Survei Petugas**
   - Catat: nama petugas, surat tugas terkait, tanggal lapor, ringkasan/hasil survei, status (Draf/Terkirim/Disetujui).
   - Tambah, ubah, dan hapus data laporan.

5. **Ringkasan Dasbor**
   - Kartu ringkasan di bagian atas: jumlah tugas yang sedang berjalan, jumlah honor belum dibayar, total honor tercatat, jumlah laporan masih berstatus draf.

6. **Penyimpanan Data**
   - Data tersimpan otomatis dan tetap ada saat dasbor dibuka kembali (tidak hilang setelah ditutup).

### 3.2 Di Luar Lingkup (Out of Scope — v1.0)

- Login/multi-pengguna dan hak akses berjenjang.
- Cetak/ekspor surat tugas dan kwitansi ke format PDF/Word resmi dengan kop surat.
- Notifikasi otomatis (misalnya pengingat honor belum dibayar).
- Integrasi dengan sistem lain (keuangan, kepegawaian, dsb).
- Riwayat perubahan data (audit trail) dan lampiran file/foto bukti survei.
- Akses dari petugas lapangan (saat ini hanya admin yang menginput).

*(Butir-butir di atas menjadi kandidat untuk versi berikutnya, lihat bagian 8.)*

## 4. Alur Pengguna Utama (User Flow)

1. Admin membuka dasbor → langsung melihat tampilan **Kalender** bulan berjalan beserta kartu ringkasan.
2. Admin menambahkan **Surat Tugas** baru saat ada tugas lapangan → tugas otomatis muncul di kalender pada rentang tanggalnya.
3. Setelah tugas berjalan/selesai, admin menambahkan **Kwitansi Honor** untuk petugas terkait dan menandai status pembayaran.
4. Petugas menyerahkan hasil survei → admin mencatatnya sebagai **Laporan Survei** dan memperbarui statusnya hingga *Disetujui*.
5. Admin memantau progres harian lewat kalender dan memantau tunggakan lewat kartu ringkasan (honor belum dibayar, laporan draf).

## 5. Model Data (Ringkas)

**Surat Tugas**
`nomor`, `perihal`, `petugas`, `lokasi`, `tglMulai`, `tglSelesai`, `status`, `catatan`

**Kwitansi Honor**
`suratId` (relasi ke Surat Tugas), `penerima`, `jumlah`, `tglBayar`, `status`, `catatan`

**Laporan Survei**
`suratId` (relasi ke Surat Tugas), `petugas`, `tglLapor`, `hasil`, `status`

## 6. Kebutuhan Non-Fungsional

- **Kemudahan pakai:** semua entri data melalui formulir sederhana (modal), tanpa perlu pelatihan khusus.
- **Kecepatan:** perubahan data langsung terlihat di kalender dan kartu ringkasan tanpa perlu memuat ulang halaman.
- **Keandalan data:** data tersimpan otomatis setiap kali ditambah/diubah/dihapus.
- **Keterbacaan status:** setiap status (surat, honor, laporan) dibedakan dengan warna agar mudah dipindai secara visual.

## 7. Kriteria Keberhasilan

- Admin dapat mencatat satu siklus penuh (surat tugas → kwitansi → laporan) tanpa keluar dari dasbor.
- Semua tugas yang aktif pada suatu tanggal dapat dilihat hanya dengan membuka tab Kalender.
- Kartu ringkasan mencerminkan data terbaru setelah setiap perubahan.

## 8. Rencana Pengembangan Selanjutnya (Kandidat v1.1+)

- Ekspor surat tugas & kwitansi ke PDF dengan format resmi (kop surat, tanda tangan).
- Filter/pencarian pada tabel (per petugas, per status, per rentang tanggal).
- Multi-pengguna dengan peran (admin vs petugas pelapor).
- Notifikasi/pengingat untuk honor yang belum dibayar melewati tenggat.
- Lampiran dokumen/foto pada laporan survei.
- Tampilan kalender mingguan sebagai alternatif tampilan bulanan.

---

*Dokumen ini merujuk pada implementasi dasbor yang telah dibuat (React, dengan penyimpanan data persisten) sebagai acuan kebutuhan produk.*