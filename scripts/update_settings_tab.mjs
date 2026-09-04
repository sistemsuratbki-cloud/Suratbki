import fs from 'fs';

const codeGs = fs.readFileSync('google-apps-script/Code.gs', 'utf-8');
const settingsPath = 'src/components/SettingsTab.jsx';
let settingsContent = fs.readFileSync(settingsPath, 'utf-8');

// 1. Add Sheet, Table icons from lucide-react if not present, and import googleSheetsService
settingsContent = settingsContent.replace(
  "import { getGoogleDriveConfig, saveGoogleDriveConfig, testGoogleDriveConnection } from '../utils/googleDriveService';",
  `import { getGoogleDriveConfig, saveGoogleDriveConfig, testGoogleDriveConnection } from '../utils/googleDriveService';\nimport { syncAllToGoogleSheet, getSavedSpreadsheetUrl } from '../utils/googleSheetsService';`
);

// 2. Replace GDRIVE_SCRIPT_CODE
const startMarker = 'const GDRIVE_SCRIPT_CODE = `';
const endMarker = 'export const SettingsTab = () => {';
const startIndex = settingsContent.indexOf(startMarker);
const endIndex = settingsContent.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newScriptCode = `const GDRIVE_SCRIPT_CODE = ${JSON.stringify(codeGs)};\n\n`;
  settingsContent = settingsContent.substring(0, startIndex) + newScriptCode + settingsContent.substring(endIndex);
}

// 3. Destructure extra data states in SettingsTab
settingsContent = settingsContent.replace(
  'const { adminSettings, updateAdminSettings, resetData, clearAllDataKeepSettings } = useData();',
  'const { adminSettings, updateAdminSettings, resetData, clearAllDataKeepSettings, suratTugas, kwitansiHonor, laporanSurvei, tariffs, gradeTariffs, masterKapal, visitSurvei } = useData();\n  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false);'
);

// 4. Add handleSyncAllToGoogleSheets
const syncFunction = `
  const handleSyncAllToGoogleSheets = async () => {
    setIsSyncingToSheets(true);
    try {
      const fullData = {
        surat_tugas: suratTugas || [],
        kwitansi_honor: kwitansiHonor || [],
        laporan_survei: laporanSurvei || [],
        tariffs: tariffs || [],
        grade_tariffs: gradeTariffs || [],
        admin_settings: adminSettings || {},
        master_kapal: masterKapal || [],
        users: usersList || [],
        visit_survei: visitSurvei || []
      };
      const result = await syncAllToGoogleSheet(fullData);
      toast.success('Seluruh data berhasil disinkronkan ke Google Sheets!');
      if (result?.spreadsheetUrl) {
        setGdriveTestResult((prev) => ({
          ...(prev || {}),
          success: true,
          message: \`Koneksi Berhasil & Data Tersinkronkan!\\nGoogle Spreadsheet: \${result.spreadsheetUrl}\`
        }));
      }
    } catch (err) {
      toast.error('Gagal sinkron ke Google Sheets: ' + err.message);
    } finally {
      setIsSyncingToSheets(false);
    }
  };
`;

settingsContent = settingsContent.replace(
  'const handleTestGDriveConnection = async () => {',
  syncFunction + '\n  const handleTestGDriveConnection = async () => {'
);

// 5. Update the Card Header and Subtitle
settingsContent = settingsContent.replace(
  '<h3 className="card-title">Penyimpanan Berkas Google Drive (Pemisahan Lampiran & Database)</h3>',
  '<h3 className="card-title">Integrasi Google Workspace (Google Drive & Google Sheets Database)</h3>'
);

settingsContent = settingsContent.replace(
  'Berkas lampiran (foto visit, bukti visit, kwitansi, tiket) disimpan otomatis di Google Drive, sedangkan data operasional (kapal, tarif, SPS, PDS, visit survei) disimpan di Database Supabase.',
  'Google Sheets digunakan sebagai Database penyimpanan seluruh data operasional (SPS, PDS, Kwitansi, Laporan, Tarif, Kapal), dan Google Drive digunakan untuk penyimpanan berkas lampiran (PDF, Foto, Bukti).'
);

// 6. Add Sync to Sheets button in the actions area
const buttonsAreaOld = `<div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>`;
const buttonsAreaNew = `<div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSyncAllToGoogleSheets}
                  disabled={isSyncingToSheets || !gdriveConfig.webAppUrl}
                  style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', borderColor: '#059669', color: '#065f46', background: '#ecfdf5' }}
                  title="Kirim seluruh data lokal (Surat Tugas, Kwitansi, Tarif, dll) ke Google Sheets"
                >
                  {isSyncingToSheets ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Sinkronisasi...</span>
                    </>
                  ) : (
                    <>
                      <Database size={15} color="#059669" />
                      <span>Kirim Data ke Google Sheets</span>
                    </>
                  )}
                </button>`;

settingsContent = settingsContent.replace(buttonsAreaOld, buttonsAreaNew);

fs.writeFileSync(settingsPath, settingsContent, 'utf-8');
console.log('✅ Berhasil memperbarui SettingsTab.jsx');
