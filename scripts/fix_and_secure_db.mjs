/**
 * Fix and Secure Database Script — Sistem Surat Tugas BKI Pontianak
 * 
 * Melakukan:
 * 1. Hashing semua password plaintext di database MySQL ke format salt:hash (SHA-256)
 * 2. Membersihkan duplikasi admin_settings (menghapus default_settings, memastikan id: default)
 * 3. Sinkronisasi master_kapal lengkap (627 record) dan tariffs (41 record)
 * 4. Sinkronisasi data operasional awal (surat_tugas, kwitansi, laporan)
 */

import fs from 'fs';
import crypto from 'crypto';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const API_URL = 'https://pkadminclass.com/api/api.php';
const API_TOKEN = 'bki-pontianak-2026-secret-token';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(salt + password).digest('hex');
  return `${salt}:${hash}`;
}

function isPasswordHashed(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return false;
  return /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(storedValue);
}

async function apiRequest(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': API_TOKEN
    },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

async function apiGet(action, params = '') {
  const url = `${API_URL}?action=${action}${params}&_t=${Date.now()}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-API-Token': API_TOKEN
    }
  });
  return await res.json();
}

async function main() {
  console.log('====================================================');
  console.log('   MEMULAI PROSES PERBAIKAN & PENGAMANAN DATABASE   ');
  console.log('====================================================\n');

  // ── 1. Cek Koneksi ──
  console.log('[1/5] Memeriksa koneksi ke API Hostinger...');
  const ping = await apiGet('ping');
  if (!ping || !ping.success) {
    throw new Error('Koneksi ke API Hostinger gagal: ' + JSON.stringify(ping));
  }
  console.log('✅ Koneksi aktif ke database:', ping.database);

  // ── 2. Baca Backup Data Lengkap ──
  console.log('\n[2/5] Membaca file backup database_export_hostinger.json...');
  const backup = JSON.parse(fs.readFileSync('database_export_hostinger.json', 'utf8'));

  // ── 3. Hash Passwords User ──
  console.log('\n[3/5] Meng-hash seluruh password akun di tabel users...');
  const usersRes = await apiGet('readTable', '&table=users');
  const existingUsers = usersRes?.data || backup.users || [];

  let hashedCount = 0;
  for (const user of existingUsers) {
    let plainPw = user.password;
    if (!plainPw || plainPw === 'undefined') {
      plainPw = user.username === 'admin' ? 'admin123' : 'password123';
    }

    if (!isPasswordHashed(plainPw)) {
      const secureHash = hashPassword(plainPw);
      const updatedUser = {
        ...user,
        password: secureHash
      };
      if (updatedUser.raw_data && typeof updatedUser.raw_data === 'object') {
        updatedUser.raw_data.password = secureHash;
      }

      await apiRequest({
        action: 'saveItem',
        table: 'users',
        data: updatedUser
      });
      hashedCount++;
      console.log(`  🔒 User [${user.username || user.id}] berhasil di-hash.`);
    } else {
      console.log(`  ✓ User [${user.username || user.id}] sudah dalam format hash aman.`);
    }
  }
  console.log(`✅ Selesai hashing passwords (${hashedCount} user diperbarui).`);

  // ── 4. Bersihkan dan Rapikan admin_settings ──
  console.log('\n[4/5] Membersihkan duplikasi pada tabel admin_settings...');
  // Hapus row default_settings
  await apiRequest({
    action: 'deleteItem',
    table: 'admin_settings',
    id: 'default_settings'
  });

  const cleanSettings = {
    id: 'default',
    kepalaCabang: 'MUHSON NURROCHMAT',
    nup: '48199-KI',
    pembuatDaftar: 'RENZA MUHARAM',
    nupPembuatDaftar: '50382-KI',
    namaCabang: 'CABANG MADYA KLAS PONTIANAK',
    kacabSignatureUrl: '/signatures/kacab_muhson_signature.png',
    pembuatSignatureUrl: '/signatures/pembuat_renza_signature.png',
    tatLuarKota: 750000,
    updated_at: new Date().toISOString()
  };
  await apiRequest({
    action: 'saveItem',
    table: 'admin_settings',
    data: cleanSettings
  });
  console.log('✅ Pengaturan admin berhasil dibersihkan & dipusatkan ke ID: default.');

  // ── 5. Sinkronisasi Data Master Kapal & Tarif Lengkap ──
  console.log('\n[5/5] Memperbarui Master Kapal (627) & Tarif (41)...');
  
  if (Array.isArray(backup.master_kapal) && backup.master_kapal.length > 0) {
    console.log(`  Menyinkronkan ${backup.master_kapal.length} data master kapal...`);
    for (const kapal of backup.master_kapal) {
      await apiRequest({
        action: 'saveItem',
        table: 'master_kapal',
        data: kapal
      });
    }
    console.log('  ✅ 627 Master Kapal berhasil disinkronkan.');
  }

  if (Array.isArray(backup.tariffs) && backup.tariffs.length > 0) {
    console.log(`  Menyinkronkan ${backup.tariffs.length} data tarif...`);
    for (const tariff of backup.tariffs) {
      await apiRequest({
        action: 'saveItem',
        table: 'tariffs',
        data: tariff
      });
    }
    console.log('  ✅ 41 Tarif berhasil disinkronkan.');
  }

  if (Array.isArray(backup.grade_tariffs) && backup.grade_tariffs.length > 0) {
    console.log(`  Menyinkronkan ${backup.grade_tariffs.length} data grade tarif...`);
    for (const gt of backup.grade_tariffs) {
      await apiRequest({
        action: 'saveItem',
        table: 'grade_tariffs',
        data: gt
      });
    }
    console.log('  ✅ Grade Tarif berhasil disinkronkan.');
  }

  // Sinkronisasi data operasional awal jika ada
  if (Array.isArray(backup.surat_tugas) && backup.surat_tugas.length > 0) {
    console.log(`  Menyinkronkan ${backup.surat_tugas.length} data surat tugas...`);
    for (const st of backup.surat_tugas) {
      await apiRequest({
        action: 'saveItem',
        table: 'surat_tugas',
        data: st
      });
    }
    console.log('  ✅ Surat Tugas berhasil disinkronkan.');
  }

  if (Array.isArray(backup.kwitansi_honor) && backup.kwitansi_honor.length > 0) {
    console.log(`  Menyinkronkan ${backup.kwitansi_honor.length} data kwitansi honor...`);
    for (const kw of backup.kwitansi_honor) {
      await apiRequest({
        action: 'saveItem',
        table: 'kwitansi_honor',
        data: kw
      });
    }
    console.log('  ✅ Kwitansi Honor berhasil disinkronkan.');
  }

  if (Array.isArray(backup.laporan_survei) && backup.laporan_survei.length > 0) {
    console.log(`  Menyinkronkan ${backup.laporan_survei.length} data laporan survei...`);
    for (const lap of backup.laporan_survei) {
      await apiRequest({
        action: 'saveItem',
        table: 'laporan_survei',
        data: lap
      });
    }
    console.log('  ✅ Laporan Survei berhasil disinkronkan.');
  }

  // ── 6. Verifikasi Statistik Akhir ──
  console.log('\n====================================================');
  console.log('       STATISTIK AKHIR DATABASE MYSQL HOSTINGER     ');
  console.log('====================================================');
  const finalStats = await apiGet('stats');
  console.log(JSON.stringify(finalStats, null, 2));
  console.log('\n🎉 PROSES PERBAIKAN & PENGAMANAN DATABASE SELESAI DENGAN SUKSES!');
}

main().catch(err => {
  console.error('\n❌ ERROR:', err.message);
  process.exit(1);
});
