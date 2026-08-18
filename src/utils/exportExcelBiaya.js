import * as ExcelJS from 'exceljs/dist/exceljs.min.js';
import { formatDateIndo } from './formatters';

export const exportBiayaPerjalananDinas = async (item, usersList = [], gradeTariffs = []) => {
  try {
    const isLuarKota = (item.kategoriPerjalanan || 'Luar Kota') === 'Luar Kota';

    // Calculate Days and Nights
    const startDate = new Date(item.tglMulai);
    const endDate = new Date(item.tglSelesai);
    const timeDiff = endDate.getTime() - startDate.getTime();
    let hr = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    if (hr < 1) hr = 1;
    let mlm = hr - 1;
    if (mlm < 0) mlm = 0;

    // Calculate Weekends (Hari Libur) automatically
    let hrLbr = 0;
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const day = currentDate.getDay();
      if (day === 0 || day === 6) hrLbr++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get Surveyor Data
    const surveyor = usersList.find(u => u.name === item.petugas) || {};
    const surveyorGrade = surveyor.grade || 'GRADE 6 A';
    const gradeData = gradeTariffs.find(g => g.grade === surveyorGrade) || {};

    // Calculations
    let sisaHariUangHarian = hr;
    if (item.tanpaUangHarian) {
      const deduct = item.hariTanpaUangHarian !== undefined ? Number(item.hariTanpaUangHarian) : hr;
      const validDeduct = Math.max(0, Math.min(deduct, hr));
      sisaHariUangHarian = hr - validDeduct;
    }

    const uangHarianRate = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (Number(gradeData.uangHarian) || 300000);
    const uangHarianTotal = uangHarianRate * sisaHariUangHarian;
    const uangHotelRate = Number(item.tiketHotel) || 0;
    const uangHotelTotal = uangHotelRate * mlm;
    const hrLbrTotal = (item.tanpaUangHarian && sisaHariUangHarian === 0) ? 0 : (hrLbr * uangHarianRate * 0.5);
    const tiketPesawatTaxi = Number(item.tiketPesawatTaxi) || Number(item.biayaTiket) || 0;
    const biayaTAT = item.tanpaTAT ? 0 : (Number(item.biayaTAT) || 0);
    const rateSK = Number(item.tarifDasar) || 0;

    let jumlah;
    if (isLuarKota) {
      jumlah = tiketPesawatTaxi + biayaTAT + rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    } else {
      jumlah = rateSK + uangHarianTotal + uangHotelTotal + hrLbrTotal;
    }

    const kacabUser = usersList.find(u => u.role === 'kacab') || {};
    const kacabName = (kacabUser.name || 'MUHSON NURROCHMAT').toUpperCase();
    const kacabDesc = kacabUser.nup || 'NUP.48199-KI';
    const pembuatUser = usersList.find(u => u.role === 'admin' || u.role === 'keuangan') || {};
    const pembuatName = (pembuatUser.name || 'RENZA MUHARAM').toUpperCase();
    const pembuatDesc = pembuatUser.nup || 'NUP.50382-KI';

    const tglMulaiStr = formatDateIndo(item.tglMulai).toUpperCase();
    const tglSelesaiStr = formatDateIndo(item.tglSelesai).toUpperCase();
    const lokasiStr = (item.lokasi || '').toUpperCase();
    const kapalStr = (item.namaKapal || '').toUpperCase();
    const petugasStr = (item.petugas || '').toUpperCase();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daftar Biaya Perjalanan');

    // Column widths
    sheet.columns = [
      { width: 5 }, { width: 25 }, { width: 6 }, { width: 6 }, { width: 8 },
      { width: 14 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 14 },
      { width: 12 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 12 }
    ];

    const thinBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' }
    };

    // Row 1-4: Header info
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = `LAMPIRAN SURAT TUGAS No ${item.nomor || '.....................'}`;
    sheet.getCell('A1').font = { size: 10 };
    sheet.getCell('E1').value = ':';
    sheet.mergeCells('F1:H1');
    sheet.getCell('F1').value = tglMulaiStr;

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = 'DAFTAR BIAYA PERJALANAN DINAS KE';
    sheet.getCell('A2').font = { size: 10 };
    sheet.getCell('E2').value = ':';
    sheet.mergeCells('F2:H2');
    sheet.getCell('F2').value = lokasiStr;

    sheet.mergeCells('A3:D3');
    sheet.getCell('A3').value = 'DALAM RANGKA SURVEY KLAS';
    sheet.getCell('A3').font = { size: 10 };
    sheet.getCell('E3').value = ':';
    sheet.mergeCells('F3:H3');
    sheet.getCell('F3').value = kapalStr;

    sheet.mergeCells('A4:D4');
    sheet.getCell('A4').value = 'SESUAI DAFTAR DAN KUITANSI TERLAMPIR';
    sheet.getCell('A4').font = { bold: true, size: 10 };

    // Row 6-7: Table headers
    const headerFont = { bold: true, size: 9 };
    const headerAlign = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const setHeaderCell = (cell, value) => {
      const c = sheet.getCell(cell);
      c.value = value;
      c.font = headerFont;
      c.alignment = headerAlign;
      c.border = thinBorder;
    };

    // Row 6 merges
    sheet.mergeCells('A6:A7'); setHeaderCell('A6', 'NO.');
    sheet.mergeCells('B6:B7'); setHeaderCell('B6', 'NAMA');
    sheet.mergeCells('C6:E6'); setHeaderCell('C6', 'JUMLAH');
    sheet.mergeCells('F6:G6'); setHeaderCell('F6', 'TANGGAL');
    sheet.mergeCells('H6:J6'); setHeaderCell('H6', 'TRANSPORT');
    sheet.mergeCells('K6:L6'); setHeaderCell('K6', 'UANG HARIAN');
    sheet.mergeCells('M6:N6'); setHeaderCell('M6', 'UANG HOTEL');
    sheet.mergeCells('O6:O7'); setHeaderCell('O6', 'HR LBR\n50%*U.HR');
    sheet.mergeCells('P6:P7'); setHeaderCell('P6', 'JUMLAH');
    sheet.mergeCells('Q6:Q7'); setHeaderCell('Q6', 'JUMLAH\nTERIMA');
    sheet.mergeCells('R6:R7'); setHeaderCell('R6', 'TANDA\nTERIMA');

    // Row 7 sub-headers
    setHeaderCell('C7', 'HR');
    setHeaderCell('D7', 'MLM');
    setHeaderCell('E7', 'HR LBR');
    setHeaderCell('F7', 'BERANGKAT');
    setHeaderCell('G7', 'KEMBALI');

    if (isLuarKota) {
      setHeaderCell('H7', 'TIKET PESAWAT,\nTAXI.DLL');
      setHeaderCell('I7', 'ASAL\nTUJUAN');
      setHeaderCell('J7', 'SESUAI SK\nDIREKSI');
    } else {
      setHeaderCell('H7', 'SESUAI DENGAN\nSK DIREKSI');
      setHeaderCell('I7', 'ASAL\nTUJUAN');
      setHeaderCell('J7', 'DALAM\nTUGAS');
    }
    setHeaderCell('K7', '11');
    setHeaderCell('L7', '12=11*3');
    setHeaderCell('M7', '13');
    setHeaderCell('N7', '14=13*4');

    // Row heights for header
    sheet.getRow(6).height = 30;
    sheet.getRow(7).height = 30;

    // Row 8: Column indices
    const idxLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12=11*3', '13', '14=13*4', '15=5*11/50%', '16', '17=16', '18'];
    idxLabels.forEach((lbl, i) => {
      const cell = sheet.getRow(8).getCell(i + 1);
      cell.value = lbl;
      cell.font = { bold: true, italic: true, size: 8 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
    });

    // Row 9: Data
    const dataAlign = { horizontal: 'center', vertical: 'middle' };
    const numAlign = { horizontal: 'right', vertical: 'middle' };
    const dataFont = { size: 9 };

    const setDataCell = (row, col, value, align = dataAlign) => {
      const cell = sheet.getRow(row).getCell(col);
      cell.value = value;
      cell.font = dataFont;
      cell.alignment = align;
      cell.border = thinBorder;
      if (typeof value === 'number') cell.numFmt = '#,##0';
    };

    setDataCell(9, 1, 1);
    setDataCell(9, 2, petugasStr, { horizontal: 'left', vertical: 'middle' });
    setDataCell(9, 3, hr);
    setDataCell(9, 4, mlm);
    setDataCell(9, 5, hrLbr > 0 ? hrLbr : '-');
    setDataCell(9, 6, tglMulaiStr);
    setDataCell(9, 7, tglSelesaiStr);

    if (isLuarKota) {
      setDataCell(9, 8, tiketPesawatTaxi > 0 ? tiketPesawatTaxi : '-', numAlign);
      setDataCell(9, 9, biayaTAT > 0 ? biayaTAT : '-', numAlign);
      setDataCell(9, 10, rateSK > 0 ? rateSK : '-', numAlign);
    } else {
      setDataCell(9, 8, rateSK > 0 ? rateSK : '-', numAlign);
      setDataCell(9, 9, '-');
      setDataCell(9, 10, '-');
    }

    setDataCell(9, 11, uangHarianRate > 0 ? uangHarianRate : '-', numAlign);
    setDataCell(9, 12, uangHarianTotal > 0 ? uangHarianTotal : '-', numAlign);
    setDataCell(9, 13, uangHotelRate > 0 ? uangHotelRate : '-', numAlign);
    setDataCell(9, 14, uangHotelTotal > 0 ? uangHotelTotal : '-', numAlign);
    setDataCell(9, 15, hrLbrTotal > 0 ? hrLbrTotal : '-', numAlign);
    setDataCell(9, 16, jumlah, numAlign);
    setDataCell(9, 17, jumlah, numAlign);
    setDataCell(9, 18, '');

    // Rows 10-12: Empty with borders
    for (let r = 10; r <= 12; r++) {
      for (let c = 1; c <= 18; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.border = thinBorder;
      }
    }

    // Row 13: Jumlah Total
    sheet.mergeCells('A13:K13');
    const jCell = sheet.getCell('A13');
    jCell.value = 'Jumlah';
    jCell.font = { bold: true, size: 9 };
    jCell.border = thinBorder;

    sheet.getCell('L13').border = thinBorder;
    sheet.mergeCells('M13:O13');
    sheet.getCell('M13').value = 'Rp.';
    sheet.getCell('M13').font = { bold: true, size: 9 };
    sheet.getCell('M13').border = thinBorder;

    const pCell = sheet.getCell('P13');
    pCell.value = jumlah;
    pCell.font = { bold: true, size: 9 };
    pCell.numFmt = '#,##0';
    pCell.alignment = numAlign;
    pCell.border = thinBorder;

    const qCell = sheet.getCell('Q13');
    qCell.value = jumlah;
    qCell.font = { bold: true, size: 9 };
    qCell.numFmt = '#,##0';
    qCell.alignment = numAlign;
    qCell.border = thinBorder;

    sheet.getCell('R13').border = thinBorder;

    // Signatures
    sheet.getCell('C18').value = 'Mengetahui';
    sheet.getCell('C18').font = { size: 9 };
    sheet.getCell('C18').alignment = { horizontal: 'center' };

    sheet.mergeCells('B19:D19');
    sheet.getCell('B19').value = 'Kepala Cabang Madya Klas Pontianak';
    sheet.getCell('B19').font = { bold: true, size: 9 };
    sheet.getCell('B19').alignment = { horizontal: 'center' };

    sheet.mergeCells('O18:Q18');
    sheet.getCell('O18').value = `PONTIANAK, ${tglMulaiStr}`;
    sheet.getCell('O18').font = { size: 9 };
    sheet.getCell('O18').alignment = { horizontal: 'center' };

    sheet.mergeCells('O19:Q19');
    sheet.getCell('O19').value = 'Pembuat Daftar';
    sheet.getCell('O19').font = { size: 9 };
    sheet.getCell('O19').alignment = { horizontal: 'center' };

    sheet.mergeCells('B23:D23');
    sheet.getCell('B23').value = kacabName;
    sheet.getCell('B23').font = { bold: true, underline: true, size: 9 };
    sheet.getCell('B23').alignment = { horizontal: 'center' };

    sheet.mergeCells('B24:D24');
    sheet.getCell('B24').value = kacabDesc;
    sheet.getCell('B24').font = { size: 9 };
    sheet.getCell('B24').alignment = { horizontal: 'center' };

    sheet.mergeCells('O23:Q23');
    sheet.getCell('O23').value = pembuatName;
    sheet.getCell('O23').font = { bold: true, underline: true, size: 9 };
    sheet.getCell('O23').alignment = { horizontal: 'center' };

    sheet.mergeCells('O24:Q24');
    sheet.getCell('O24').value = pembuatDesc;
    sheet.getCell('O24').font = { size: 9 };
    sheet.getCell('O24').alignment = { horizontal: 'center' };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const fileName = `Biaya_Perjalanan_Dinas_${item.petugas}_${item.lokasi || ''}.xlsx`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);

  } catch (error) {
    console.error('Error exporting Excel:', error);
    alert('Gagal membuat file Excel: ' + error.message);
  }
};
