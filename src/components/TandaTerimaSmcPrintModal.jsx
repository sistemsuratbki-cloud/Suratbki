import React, { useState, useEffect } from 'react';
import { X, Printer, FileSpreadsheet, Maximize2, Minimize2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { toast } from 'react-hot-toast';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatDateIndo } from '../utils/formatters';
import { ModalPortal } from './ModalPortal';
import { DanantaraLogo } from './DanantaraLogo';
import { IDSurveyLogo } from './IDSurveyLogo';
import { BKILogo } from './BKILogo';

export const TandaTerimaSmcPrintModal = ({
  isOpen,
  onClose,
  suratTugas = null
}) => {
  const { adminSettings } = useData();
  const { usersList } = useAuth();

  const [withSignature, setWithSignature] = useState(true);
  const [isFitToScreen, setIsFitToScreen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen || !suratTugas) return null;

  const isMobileScreen = windowWidth <= 768;
  const targetDocWidth = 980;
  const availableWidth = isMobileScreen ? (windowWidth - 20) : Math.min(windowWidth * 0.94, 1150) - 30;
  const fitScale = isFitToScreen ? Math.min(Math.max(availableWidth / targetDocWidth, 0.28), 1) : 1;

  const cleanNamaKapal = (suratTugas.namaKapal || '').toUpperCase().trim();
  const namaKapalDisplay = cleanNamaKapal.startsWith('AUDIT')
    ? cleanNamaKapal
    : `AUDIT ${cleanNamaKapal}`;

  const noAgenda = suratTugas.noAgenda || suratTugas.agenda || '';
  const noSap = suratTugas.noSap || '';
  const noSuratSmc = suratTugas.noSuratSmc || '1857/KU.604/KI-21';
  const tempatSurvey = (suratTugas.tempatSurvey || suratTugas.lokasi || 'PONTIANAK').toUpperCase();

  const tglMulaiFormatted = formatDateIndo(suratTugas.tglMulai || new Date().toISOString().split('T')[0]).toUpperCase();
  const tglSelesaiFormatted = formatDateIndo(suratTugas.tglSelesai || suratTugas.tglMulai || new Date().toISOString().split('T')[0]).toUpperCase();

  const tarifExpertise = Number(suratTugas.tarifExpertise) || 1500000;
  const jumlahPendamping = Number(suratTugas.jumlahPendamping) || 2;
  const totalJumlahTerima = tarifExpertise * jumlahPendamping;

  // Pembuat Daftar: Renza Muharam (NUP.50382-KI)
  const pembuatUser = (usersList || []).find((u) =>
    (adminSettings?.pembuatDaftar && u.name === adminSettings.pembuatDaftar) ||
    (u.name && u.name.toUpperCase().includes('RENZA'))
  ) || {};
  const pembuatDaftarName = (adminSettings?.pembuatDaftar || pembuatUser.name || 'RENZA MUHARAM').toUpperCase();
  const pembuatDaftarNup = adminSettings?.nupPembuatDaftar || pembuatUser.nup || '50382-KI';

  const kepalaCabangName = (adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT').toUpperCase();
  const kepalaCabangNup = adminSettings?.nup || '48199-KI';

  const isValidSignature = (sig) => {
    return sig && typeof sig === 'string' && sig.trim() !== '' && sig !== 'null' && sig !== 'undefined';
  };

  const kacabUser = (usersList || []).find((u) => u.name === kepalaCabangName || u.role === 'kacab') || {};
  const kacabSignature = adminSettings?.kacabSignatureUrl || kacabUser.signatureUrl || '/signatures/kacab_muhson_signature.png';
  const pembuatSignature = adminSettings?.pembuatSignatureUrl || pembuatUser.signatureUrl || '/signatures/pembuat_renza_signature.png';

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `Tanda_Terima_SMC_${cleanNamaKapal.replace(/[^a-zA-Z0-9_-]/g, '_')}${withSignature ? '_Dengan_TTD' : '_Tanpa_TTD'}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Tanda Terima SMC');

      // Setup page setup for landscape printing
      worksheet.pageSetup = {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1
      };

      // Set column widths
      worksheet.columns = [
        { width: 6 },   // A: NO
        { width: 30 },  // B: TEMPAT SURVEY
        { width: 16 },  // C: TANGGAL AUDIT 1
        { width: 16 },  // D: TANGGAL AUDIT 2
        { width: 16 },  // E: EXPERTISE
        { width: 18 },  // F: JUMLAH PENDAMPING SYAHBANDAR
        { width: 18 },  // G: JUMLAH TERIMA
        { width: 18 }   // H: TANDA TERIMA
      ];

      // Row 1 to 3: Space for logos
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Row 4 & 5: Title
      const titleRow1 = worksheet.addRow(['', 'TANDA TERIMA EXPERTISE PETUGAS DARI PLAG STATE DALAM RANGKA WITNES PELAKSANAAN']);
      worksheet.mergeCells('B4:H4');
      titleRow1.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
      titleRow1.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

      const titleRow2 = worksheet.addRow(['', `SURVEY STATUTORY NON KONVENSI SESUAI SURAT NO.${noSuratSmc}`]);
      worksheet.mergeCells('B5:H5');
      titleRow2.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
      titleRow2.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]); // Blank Row 6

      // Row 7 to 9: Meta Information
      const metaNama = worksheet.addRow(['NAMA KAPAL', `: ${namaKapalDisplay}`]);
      metaNama.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      metaNama.getCell(2).font = { name: 'Calibri', size: 10, bold: true };

      const metaAgenda = worksheet.addRow(['NO AGENDA', `: ${noAgenda}`]);
      metaAgenda.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      metaAgenda.getCell(2).font = { name: 'Calibri', size: 10, bold: true };

      const metaSap = worksheet.addRow(['NO SAP', `: ${noSap}`]);
      metaSap.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
      metaSap.getCell(2).font = { name: 'Calibri', size: 10, bold: true };

      worksheet.addRow([]); // Blank Row 10

      // Table Header Row 11
      const headerRow1 = worksheet.addRow([
        'NO',
        'TEMPAT SURVEY',
        'TANGGAL AUDIT',
        '',
        'EXPERTISE',
        'JUMLAH\nPENDAMPING\nSYAHBANDAR',
        'JUMLAH TERIMA',
        'TANDA TERIMA'
      ]);
      worksheet.mergeCells('C11:D11');
      headerRow1.height = 36;

      // Table Header Row 12 (Numbering)
      const headerRow2 = worksheet.addRow(['1', '2', '3', '4', '5', '6', '7=5X6', '7']);
      headerRow2.height = 18;

      // Style Table Headers
      [headerRow1, headerRow2].forEach((row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: 'Calibri', size: 9, bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      });

      // Table Data Row 13
      const dataRow = worksheet.addRow([
        1,
        tempatSurvey,
        tglMulaiFormatted,
        tglSelesaiFormatted,
        tarifExpertise,
        jumlahPendamping,
        totalJumlahTerima,
        ''
      ]);
      dataRow.height = 36;
      dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 9, bold: colNumber === 2 || colNumber === 7 };
        cell.alignment = {
          horizontal: colNumber === 2 ? 'center' : 'center',
          vertical: 'middle',
          wrapText: true
        };
        if (colNumber === 5 || colNumber === 7) {
          cell.numFmt = '#,##0';
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Total Row 14
      const totalRow = worksheet.addRow(['TOTAL', '', '', '', '', '', totalJumlahTerima, '']);
      worksheet.mergeCells('A14:F14');
      totalRow.height = 24;
      totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (colNumber === 7) {
          cell.numFmt = '#,##0';
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      worksheet.addRow([]); // Blank Row 15

      // Note Row 16
      const noteRow = worksheet.addRow(['KET: DISERAHKAN OLEH AUDITOR LANGSUNG KE PETUGAS PENDAMPING']);
      noteRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true };

      worksheet.addRow([]); // Blank Row 17

      // Signature Header Row 18
      const sigHeaderRow = worksheet.addRow(['', 'MENGETAHUI ,', '', '', '', '', `PONTIANAK,   ${tglMulaiFormatted}`, '']);
      sigHeaderRow.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true };
      sigHeaderRow.getCell(2).alignment = { horizontal: 'center' };
      sigHeaderRow.getCell(7).font = { name: 'Calibri', size: 9.5, bold: true };
      sigHeaderRow.getCell(7).alignment = { horizontal: 'center' };

      // Signature Title Row 19
      const sigTitleRow = worksheet.addRow(['', 'KEPALA CABANG MADYA KLAS PONTIANAK', '', '', '', '', 'Pembuat Daftar', '']);
      sigTitleRow.getCell(2).font = { name: 'Calibri', size: 9.5, bold: true };
      sigTitleRow.getCell(2).alignment = { horizontal: 'center' };
      sigTitleRow.getCell(7).font = { name: 'Calibri', size: 9.5, bold: true };
      sigTitleRow.getCell(7).alignment = { horizontal: 'center' };

      // Blank rows for signature space (Rows 20, 21, 22)
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      // Signature Name Row 23
      const sigNameRow = worksheet.addRow(['', kepalaCabangName, '', '', '', '', pembuatDaftarName, '']);
      sigNameRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      sigNameRow.getCell(2).alignment = { horizontal: 'center' };
      sigNameRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, underline: true };
      sigNameRow.getCell(7).alignment = { horizontal: 'center' };

      // Signature NUP Row 24
      const sigNupRow = worksheet.addRow(['', `NUP.${kepalaCabangNup}`, '', '', '', '', `NUP.${pembuatDaftarNup}`, '']);
      sigNupRow.getCell(2).font = { name: 'Calibri', size: 9, bold: true };
      sigNupRow.getCell(2).alignment = { horizontal: 'center' };
      sigNupRow.getCell(7).font = { name: 'Calibri', size: 9, bold: true };
      sigNupRow.getCell(7).alignment = { horizontal: 'center' };

      // Write & Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tanda_Terima_SMC_${cleanNamaKapal.replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('File Excel Tanda Terima SMC berhasil diunduh!');
    } catch (err) {
      console.error('Error exporting SMC excel:', err);
      toast.error('Gagal mengekspor Excel Tanda Terima SMC');
    }
  };

  return (
    <ModalPortal>
      <div className="modal-overlay print-only-modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
        <div
          className="modal-content print-preview-modal"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '1050px', width: '96vw', height: '92vh', display: 'flex', flexDirection: 'column', padding: 0 }}
        >
          {/* Header Controls (No Print) */}
          <div className="modal-header no-print" style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.4rem', borderRadius: '6px' }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Cetak Tanda Terima Expertise Flag State (SMC)
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Format Resmi Sesuai Template Excel • A4 Landscape
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${withSignature ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWithSignature(!withSignature)}
                style={{
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: withSignature ? '#059669' : '#e2e8f0',
                  color: withSignature ? '#ffffff' : '#475569',
                  borderColor: withSignature ? '#047857' : '#cbd5e1'
                }}
                title={withSignature ? 'Klik untuk beralih ke versi Tanpa TTD' : 'Klik untuk beralih ke versi Dengan TTD'}
              >
                <span>{withSignature ? '✍️ Dgn TTD' : '📄 Tanpa TTD'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsFitToScreen(!isFitToScreen)}
                title={isFitToScreen ? 'Tampilkan Ukuran Asli 100%' : 'Sesuaikan dengan Lebar Layar'}
              >
                {isFitToScreen ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                <span>{isFitToScreen ? 'Ukuran Penuh' : 'Pas Layar'}</span>
              </button>

              <button
                type="button"
                className="btn btn-sm"
                onClick={handleExportExcel}
                style={{
                  background: '#047857',
                  borderColor: '#047857',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
                title="Download file Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderColor: '#047857',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Printer size={15} />
                <span>Cetak / Simpan PDF</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Printable Preview Area */}
          <div
            className="modal-body print-preview-body"
            style={{
              flex: 1,
              overflow: 'auto',
              background: '#525659',
              padding: isMobileScreen ? '0.75rem' : '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}
          >
            <div
              className="printable-page-landscape printable-receipt-smc"
              style={{
                width: `${targetDocWidth}px`,
                minHeight: '620px',
                background: '#ffffff',
                color: '#000000',
                padding: '2.5rem 3rem',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
                fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif',
                boxSizing: 'border-box',
                transform: `scale(${fitScale})`,
                transformOrigin: 'top center',
                marginBottom: isFitToScreen && fitScale < 1 ? `-${(1 - fitScale) * 620}px` : '0'
              }}
            >
              {/* Top Header Logos */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  paddingBottom: '0.5rem'
                }}
              >
                <DanantaraLogo height={42} />
                <IDSurveyLogo height={46} />
                <BKILogo height={42} />
              </div>

              {/* Document Title */}
              <div
                style={{
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '11.5pt',
                  lineHeight: '1.35',
                  marginBottom: '1.5rem',
                  textTransform: 'uppercase',
                  padding: '0 1rem'
                }}
              >
                TANDA TERIMA EXPERTISE PETUGAS DARI PLAG STATE DALAM RANGKA WITNES PELAKSANAAN<br />
                SURVEY STATUTORY NON KONVENSI SESUAI SURAT NO.{noSuratSmc}
              </div>

              {/* Meta Header Information */}
              <div style={{ marginBottom: '1rem', fontSize: '10pt', fontWeight: 700, lineHeight: 1.6 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '130px', padding: '1px 0' }}>NAMA KAPAL</td>
                      <td style={{ width: '15px', padding: '1px 0' }}>:</td>
                      <td style={{ padding: '1px 0', fontWeight: 800 }}>{namaKapalDisplay}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1px 0' }}>NO AGENDA</td>
                      <td style={{ padding: '1px 0' }}>:</td>
                      <td style={{ padding: '1px 0' }}>{noAgenda}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '1px 0' }}>NO SAP</td>
                      <td style={{ padding: '1px 0' }}>:</td>
                      <td style={{ padding: '1px 0' }}>{noSap}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table Data */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  fontSize: '9pt',
                  textAlign: 'center',
                  marginBottom: '0.75rem'
                }}
              >
                <thead>
                  <tr style={{ fontWeight: 700 }}>
                    <th style={{ border: '1px solid #000000', padding: '6px 4px', width: '38px' }}>
                      NO
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '220px' }}>
                      TEMPAT SURVEY
                    </th>
                    <th colSpan={2} style={{ border: '1px solid #000000', padding: '6px 8px' }}>
                      TANGGAL AUDIT
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '120px' }}>
                      EXPERTISE
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '6px 6px', width: '130px', lineHeight: 1.2 }}>
                      JUMLAH<br />PENDAMPING<br />SYAHBANDAR
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '130px' }}>
                      JUMLAH TERIMA
                    </th>
                    <th style={{ border: '1px solid #000000', padding: '6px 8px', width: '130px' }}>
                      TANDA TERIMA
                    </th>
                  </tr>
                  {/* Column Numbering Guide (1, 2, 3, 4, 5, 6, 7=5x6, 7) */}
                  <tr style={{ fontWeight: 600, fontSize: '8.5pt' }}>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>1</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>2</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>3</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>4</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>5</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>6</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>7=5X6</th>
                    <th style={{ border: '1px solid #000000', padding: '3px 4px' }}>7</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '48px', verticalAlign: 'middle' }}>
                    <td style={{ border: '1px solid #000000', padding: '6px 4px', fontWeight: 600 }}>1</td>
                    <td style={{ border: '1px solid #000000', padding: '6px 8px', fontWeight: 700, textAlign: 'center' }}>
                      {tempatSurvey}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      {tglMulaiFormatted}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 6px', whiteSpace: 'nowrap' }}>
                      {tglSelesaiFormatted}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {Number(tarifExpertise).toLocaleString('id-ID')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 6px', fontWeight: 700 }}>
                      {jumlahPendamping}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>
                      {Number(totalJumlahTerima).toLocaleString('id-ID')}
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 8px' }}>
                      {/* Empty signature column */}
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr style={{ fontWeight: 800, height: '32px' }}>
                    <td colSpan={6} style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center' }}>
                      TOTAL
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '6px 8px', textAlign: 'center', fontWeight: 800, fontSize: '9.5pt' }}>
                      {Number(totalJumlahTerima).toLocaleString('id-ID')}
                    </td>
                    <td style={{ border: '1px solid #000000' }}></td>
                  </tr>
                </tbody>
              </table>

              {/* Note / Keterangan */}
              <div style={{ fontSize: '9pt', fontWeight: 800, marginBottom: '2.5rem', marginTop: '0.4rem' }}>
                KET: DISERAHKAN OLEH AUDITOR LANGSUNG KE PETUGAS PENDAMPING
              </div>

              {/* Signatures */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  fontSize: '9.5pt',
                  marginTop: '1.5rem',
                  pageBreakInside: 'avoid'
                }}
              >
                {/* Left: Mengetahui Kepala Cabang */}
                <div style={{ textAlign: 'center', width: '320px', position: 'relative' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>MENGETAHUI ,</div>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    KEPALA CABANG MADYA KLAS PONTIANAK
                  </div>
                  <div style={{ position: 'relative', height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                    {withSignature && isValidSignature(kacabSignature) ? (
                      <img
                        src={kacabSignature}
                        alt="TTD Kepala Cabang"
                        style={{
                          height: '75px',
                          maxHeight: '75px',
                          maxWidth: '220px',
                          width: 'auto',
                          objectFit: 'contain',
                          transform: 'scale(1.1)',
                          transformOrigin: 'center'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {kepalaCabangName}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '9pt' }}>
                    NUP.{kepalaCabangNup}
                  </div>
                </div>

                {/* Right: Pembuat Daftar / Auditor */}
                <div style={{ textAlign: 'center', width: '280px', position: 'relative' }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                    PONTIANAK, &nbsp; {tglMulaiFormatted}
                  </div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    Pembuat Daftar
                  </div>
                  <div style={{ position: 'relative', height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
                    {withSignature && isValidSignature(pembuatSignature) ? (
                      <img
                        src={pembuatSignature}
                        alt="TTD Pembuat Daftar"
                        style={{
                          height: '75px',
                          maxHeight: '75px',
                          maxWidth: '200px',
                          width: 'auto',
                          objectFit: 'contain'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 800, textDecoration: 'underline' }}>
                    {pembuatDaftarName}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '9pt' }}>
                    NUP.{pembuatDaftarNup}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-receipt-smc, .printable-receipt-smc * {
            visibility: visible !important;
          }
          .printable-receipt-smc {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 1.5cm !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
        }
      `}</style>
    </ModalPortal>
  );
};

