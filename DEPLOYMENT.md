# Deployment Guide for Suratbki

## Vercel Deployment

### Prerequisites
- Akun Vercel (vercel.com)
- GitHub account dengan repo `sistemsuratbki-cloud/Suratbki`
- Supabase project `brqnkwvvasoqogoibejh`

### Environment Variables di Vercel
Setelah deploy ke Vercel, tambahkan environment variables berikut di **Project Settings → Environment Variables**:

```
VITE_SUPABASE_URL=https://brqnkwvvasoqogoibejh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycW5rd3Z2YXNvcW9nb2liZWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NDQ2NzcsImV4cCI6MjEwMzAyMDY3N30.pVXe70CqwbQxs8r7miOm329RYLxHsOFk6Og1gbYAAGU
```

**CATATAN**: Jangan sertakan `SUPABASE_SERVICE_ROLE_KEY` di environment variables Vercel karena hanya untuk server-side.

### Steps to Deploy

1. **Deploy via GitHub**:
   - Login ke Vercel
   - Import project dari GitHub → pilih `sistemsuratbki-cloud/Suratbki`
   - Framework preset: **Vite**
   - Root directory: `.`
   - Environment variables: Tambahkan 2 variables di atas

2. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Deploy**:
   - Klik "Deploy"
   - Setelah deploy selesai, akses URL yang diberikan

### Troubleshooting

#### Build Issues
1. **Chunk Size Warning**: Sudah diatasi dengan `chunkSizeWarningLimit: 2000`
2. **Deprecated Packages Warning**: Warning dari internal build tools Vite, tidak mempengaruhi deployment
3. **Allow-scripts Warning**: Dapat diabaikan untuk deployment, atau jalankan `npm approve-scripts --allow-scripts-pending` untuk review

#### Runtime Issues
1. **CORS Error**: Pastikan Supabase project memiliki CORS settings yang benar di **Project Settings → API**
2. **Database Connection Error**: Periksa environment variables di Vercel
3. **RLS Issues**: Semua tabel menggunakan RLS dengan policy "ALLOW ALL"

### Post-Deployment Checklist
- [ ] Database tables ada di Supabase (7 tables)
- [ ] Storage buckets ada (surat-tugas, lampiran, signatures)
- [ ] Environment variables di Vercel sudah benar
- [ ] Build berhasil tanpa error
- [ ] Aplikasi dapat mengakses data dari Supabase

### GitHub Repos
- **Source**: `Prasetya1721/Suratbki` (tidak di-push)
- **Deployment**: `sistemsuratbki-cloud/Suratbki` (dipakai untuk Vercel)

### Supabase Configuration
- Project ID: `brqnkwvvasoqogoibejh`
- API URL: `https://brqnkwvvasoqogoibejh.supabase.co`
- Anon Key: (lihat di atas)
- Service Role: (simpan lokal, jangan deploy)

### Build Optimizations
✅ `chunkSizeWarningLimit: 2000` di `vite.config.js`
✅ Manual chunking untuk React dan Supabase
✅ Bundle size: ~1.8MB total (acceptable untuk Vercel)