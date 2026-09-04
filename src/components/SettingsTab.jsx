import React, { useState, useEffect } from 'react';
import {
  KeyRound, Check, Shield, Eye, EyeOff, RotateCcw, User, FileCheck2, Upload, Trash2,
  Database, HardDrive, Zap, Loader2, CheckCircle2, AlertCircle, HelpCircle, Copy, CheckCheck, ExternalLink, Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ConfirmModal } from './ConfirmModal';
import { validatePasswordStrength } from '../utils/security';
import { fileToSignatureDataUrl, isValidSignature } from '../utils/signatureHelper';
import {
  getGoogleDriveConfig,
  saveGoogleDriveConfig,
  testGoogleDriveConnection
} from '../utils/googleDriveService';
import { syncAllToGoogleSheet, getSavedSpreadsheetUrl } from '../utils/googleSheetsService';
import {
  getHostingerConfig,
  saveHostingerConfig,
  testHostingerConnection,
  syncAllToHostinger,
  fetchHostingerStats
} from '../utils/hostingerDbService';
import { toast } from 'react-hot-toast';

const GDRIVE_SCRIPT_CODE = "/**\n * Google Apps Script Web App — Sistem Surat Tugas BKI Pontianak\n * \n * INTEGRASI DUA-DALAM-SATU:\n * 1. GOOGLE SHEETS DATABASE — Menyimpan semua data tabel (SPS/PDS, Kwitansi, Laporan, Tarif, Kapal, dll)\n * 2. GOOGLE DRIVE STORAGE   — Menyimpan semua berkas lampiran (PDF Tiket, Kwitansi Hotel, Foto Survei)\n * \n * =========================================================================\n * PANDUAN PENERAPAN (DEPLOY) DI GOOGLE APPS SCRIPT:\n * =========================================================================\n * 1. Buka https://script.google.com/\n * 2. Buka proyek \"BKI Drive Service\" (atau buat proyek baru).\n * 3. Hapus SEMUA isi Code.gs lama, lalu tempelkan (PASTE) seluruh kode ini.\n * 4. Klik ikon Disket (Save / Simpan).\n * 5. Klik tombol biru \"Deploy\" (Terapkan) di kanan atas -> pilih \"Manage deployments\".\n * 6. Klik ikon Pensil (Edit) -> pada Version pilih \"New version\" (Versi Baru).\n *    Pastikan \"Who has access\" disetel ke \"Anyone\" (Siapa saja).\n * 7. Klik \"Deploy\".\n * =========================================================================\n */\n\nvar DB_SPREADSHEET_NAME = \"DATABASE_SURAT_BKI_PONTIANAK\";\n\n// ─── HTTP GET ─────────────────────────────────────────────────────────────────\nfunction doGet(e) {\n  var callback = (e && e.parameter && e.parameter.callback) || \"\";\n  var action = (e && e.parameter && e.parameter.action) || \"ping\";\n\n  var responseData = {};\n\n  try {\n    if (action === \"getAllData\" || action === \"readAll\") {\n      var db = getOrCreateDatabaseSpreadsheet();\n      var allData = readAllTablesFromSpreadsheet(db);\n      responseData = {\n        success: true,\n        data: allData,\n        spreadsheetUrl: db.getUrl(),\n        timestamp: new Date().toISOString()\n      };\n    } else if (action === \"readTable\") {\n      var tableName = e.parameter.table || \"surat_tugas\";\n      var dbSheet = getOrCreateDatabaseSpreadsheet();\n      var rows = readTableRows(dbSheet, tableName);\n      responseData = {\n        success: true,\n        table: tableName,\n        data: rows,\n        timestamp: new Date().toISOString()\n      };\n    } else {\n      // Default: Ping\n      var activeUser = \"\";\n      try { activeUser = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(); } catch (err) {}\n      var dbSpreadsheet = getOrCreateDatabaseSpreadsheet();\n      responseData = {\n        success: true,\n        message: \"Google Workspace API (Drive + Sheets) BKI Pontianak aktif dan siap digunakan!\",\n        action: action,\n        userEmail: activeUser || \"sistemsuratbki@gmail.com\",\n        spreadsheetUrl: dbSpreadsheet.getUrl(),\n        spreadsheetId: dbSpreadsheet.getId(),\n        quotaRemaining: getDriveQuotaInfo(),\n        timestamp: new Date().toISOString()\n      };\n    }\n  } catch (err) {\n    responseData = {\n      success: false,\n      message: \"Error doGet: \" + err.toString()\n    };\n  }\n\n  if (callback) {\n    return ContentService.createTextOutput(callback + \"(\" + JSON.stringify(responseData) + \");\")\n      .setMimeType(ContentService.MimeType.JAVASCRIPT);\n  }\n\n  return ContentService.createTextOutput(JSON.stringify(responseData))\n    .setMimeType(ContentService.MimeType.JSON);\n}\n\n// ─── HTTP POST ────────────────────────────────────────────────────────────────\nfunction doPost(e) {\n  try {\n    var payload = {};\n\n    if (e && e.postData && e.postData.contents) {\n      try {\n        payload = JSON.parse(e.postData.contents);\n      } catch (jsonErr) {\n        payload = e.parameter || {};\n      }\n    } else if (e && e.parameter) {\n      payload = e.parameter;\n    }\n\n    var action = payload.action || \"ping\";\n\n    // 1. PING / TEST KONEKSI\n    if (action === \"ping\") {\n      var userEmail = \"\";\n      try { userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(); } catch (err) {}\n      var ss = getOrCreateDatabaseSpreadsheet();\n      return createJsonResponse({\n        success: true,\n        message: \"Koneksi ke Google Drive & Google Sheets BKI berhasil terhubung!\",\n        userEmail: userEmail || \"sistemsuratbki@gmail.com\",\n        spreadsheetUrl: ss.getUrl(),\n        quota: getDriveQuotaInfo(),\n        timestamp: new Date().toISOString()\n      });\n    }\n\n    // 2. GET ALL DATA (DATABASE GOOGLE SHEETS)\n    if (action === \"getAllData\" || action === \"readAll\") {\n      var dbAll = getOrCreateDatabaseSpreadsheet();\n      var dataObj = readAllTablesFromSpreadsheet(dbAll);\n      return createJsonResponse({\n        success: true,\n        data: dataObj,\n        spreadsheetUrl: dbAll.getUrl(),\n        timestamp: new Date().toISOString()\n      });\n    }\n\n    // 3. SAVE SINGLE ITEM (UPSERT ITEM KE SHEET TAB TERTENTU)\n    if (action === \"saveItem\") {\n      var targetTable = payload.table;\n      var itemData = payload.data;\n      if (!targetTable || !itemData || !itemData.id) {\n        return createJsonResponse({ success: false, message: \"Parameter 'table' dan 'data.id' wajib diisi.\" }, 400);\n      }\n\n      var dbSave = getOrCreateDatabaseSpreadsheet();\n      upsertItemToSheet(dbSave, targetTable, itemData);\n\n      return createJsonResponse({\n        success: true,\n        message: \"Item \" + itemData.id + \" berhasil disimpan ke Google Sheets [\" + targetTable + \"]\",\n        table: targetTable,\n        id: itemData.id\n      });\n    }\n\n    // 4. DELETE ITEM DARI GOOGLE SHEET\n    if (action === \"deleteItem\") {\n      var delTable = payload.table;\n      var delId = payload.id;\n      if (!delTable || !delId) {\n        return createJsonResponse({ success: false, message: \"Parameter 'table' dan 'id' wajib diisi.\" }, 400);\n      }\n\n      var dbDel = getOrCreateDatabaseSpreadsheet();\n      deleteItemFromSheet(dbDel, delTable, delId);\n\n      return createJsonResponse({\n        success: true,\n        message: \"Item \" + delId + \" berhasil dihapus dari Google Sheets [\" + delTable + \"]\"\n      });\n    }\n\n    // 5. SYNC ALL DATA (MASSAL KE GOOGLE SHEETS)\n    if (action === \"syncAll\") {\n      var fullData = payload.data || {};\n      var dbSync = getOrCreateDatabaseSpreadsheet();\n\n      var tables = ['surat_tugas', 'kwitansi_honor', 'laporan_survei', 'tariffs', 'grade_tariffs', 'admin_settings', 'master_kapal', 'users', 'visit_survei'];\n      var stats = {};\n\n      for (var i = 0; i < tables.length; i++) {\n        var tbl = tables[i];\n        var rows = fullData[tbl] || fullData[toCamelCase(tbl)] || [];\n        if (Array.isArray(rows) && rows.length > 0) {\n          syncTableBatch(dbSync, tbl, rows);\n          stats[tbl] = rows.length;\n        } else if (tbl === 'admin_settings' && fullData[tbl] && typeof fullData[tbl] === 'object') {\n          syncTableBatch(dbSync, tbl, [fullData[tbl]]);\n          stats[tbl] = 1;\n        }\n      }\n\n      return createJsonResponse({\n        success: true,\n        message: \"Seluruh data berhasil disinkronkan ke Google Sheets!\",\n        stats: stats,\n        spreadsheetUrl: dbSync.getUrl()\n      });\n    }\n\n    // 6. UPLOAD FILE KE GOOGLE DRIVE\n    if (action === \"uploadFile\" || action === \"upload\") {\n      return handleUploadFileToDrive(payload);\n    }\n\n    // 7. HAPUS FILE DARI GOOGLE DRIVE\n    if (action === \"deleteFile\" || action === \"delete\") {\n      return handleDeleteFileFromDrive(payload);\n    }\n\n    return createJsonResponse({\n      success: false,\n      message: \"Aksi '\" + action + \"' tidak dikenali oleh Google Workspace API.\"\n    }, 400);\n\n  } catch (error) {\n    return createJsonResponse({\n      success: false,\n      message: \"Terjadi kesalahan server: \" + error.toString()\n    }, 500);\n  }\n}\n\n// ─── GOOGLE SHEETS HELPER FUNCTIONS ──────────────────────────────────────────\n\nfunction getOrCreateDatabaseSpreadsheet() {\n  var files = DriveApp.getFilesByName(DB_SPREADSHEET_NAME);\n  while (files.hasNext()) {\n    var file = files.next();\n    if (!file.isTrashed()) {\n      try {\n        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);\n      } catch (eShare) {}\n      return SpreadsheetApp.openById(file.getId());\n    }\n  }\n\n  // Buat baru jika belum ada\n  var newSheet = SpreadsheetApp.create(DB_SPREADSHEET_NAME);\n  try {\n    var fileObj = DriveApp.getFileById(newSheet.getId());\n    fileObj.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);\n  } catch (eShare2) {}\n  return newSheet;\n}\n\nfunction getOrCreateSheetTab(ss, tabName) {\n  var sheet = ss.getSheetByName(tabName);\n  if (!sheet) {\n    sheet = ss.insertSheet(tabName);\n    // Inisialisasi Header: ID, Ringkasan, RawData, UpdatedAt\n    sheet.appendRow([\"ID\", \"NOMOR / NAMA\", \"STATUS / DETAIL\", \"PETUGAS / USER\", \"RAW_DATA\", \"UPDATED_AT\"]);\n    sheet.setFrozenRows(1);\n    sheet.getRange(1, 1, 1, 6).setBackground(\"#1e3a8a\").setFontColor(\"#ffffff\").setFontWeight(\"bold\");\n  }\n  return sheet;\n}\n\nfunction upsertItemToSheet(ss, tabName, item) {\n  var sheet = getOrCreateSheetTab(ss, tabName);\n  var id = String(item.id || item.username || \"\");\n  if (!id) return;\n\n  var lastRow = sheet.getLastRow();\n  var rowIndexToUpdate = -1;\n\n  if (lastRow > 1) {\n    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();\n    for (var i = 0; i < ids.length; i++) {\n      if (String(ids[i][0]) === id) {\n        rowIndexToUpdate = i + 2;\n        break;\n      }\n    }\n  }\n\n  var col2 = item.nomor || item.namaKapal || item.name || item.tujuan || item.grade || item.kepalaCabang || \"\";\n  var col3 = item.status || item.approvalStatus || item.perihal || item.rate || item.uangHarian || item.role || \"\";\n  var col4 = item.petugas || item.penerima || item.username || item.pemohon || \"\";\n  var rawJson = JSON.stringify(item);\n  var updatedAt = new Date().toISOString();\n\n  var rowValues = [id, col2, col3, col4, rawJson, updatedAt];\n\n  if (rowIndexToUpdate > 0) {\n    sheet.getRange(rowIndexToUpdate, 1, 1, 6).setValues([rowValues]);\n  } else {\n    sheet.appendRow(rowValues);\n  }\n}\n\nfunction deleteItemFromSheet(ss, tabName, id) {\n  var sheet = ss.getSheetByName(tabName);\n  if (!sheet) return;\n\n  var lastRow = sheet.getLastRow();\n  if (lastRow <= 1) return;\n\n  var idStr = String(id);\n  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();\n  for (var i = 0; i < ids.length; i++) {\n    if (String(ids[i][0]) === idStr) {\n      sheet.deleteRow(i + 2);\n      break;\n    }\n  }\n}\n\nfunction syncTableBatch(ss, tabName, items) {\n  if (!Array.isArray(items) || items.length === 0) return;\n  var sheet = ss.getSheetByName(tabName);\n  if (sheet) {\n    ss.deleteSheet(sheet);\n  }\n  sheet = ss.insertSheet(tabName);\n  sheet.appendRow([\"ID\", \"NOMOR / NAMA\", \"STATUS / DETAIL\", \"PETUGAS / USER\", \"RAW_DATA\", \"UPDATED_AT\"]);\n  sheet.setFrozenRows(1);\n  sheet.getRange(1, 1, 1, 6).setBackground(\"#1e3a8a\").setFontColor(\"#ffffff\").setFontWeight(\"bold\");\n\n  var rowsToAdd = [];\n  for (var i = 0; i < items.length; i++) {\n    var item = items[i];\n    if (!item) continue;\n    var id = String(item.id || item.username || (\"item_\" + i));\n    var col2 = item.nomor || item.namaKapal || item.name || item.tujuan || item.grade || item.kepalaCabang || \"\";\n    var col3 = item.status || item.approvalStatus || item.perihal || item.rate || item.uangHarian || item.role || \"\";\n    var col4 = item.petugas || item.penerima || item.username || item.pemohon || \"\";\n    var rawJson = JSON.stringify(item);\n    var updatedAt = new Date().toISOString();\n    rowsToAdd.push([id, col2, col3, col4, rawJson, updatedAt]);\n  }\n\n  if (rowsToAdd.length > 0) {\n    sheet.getRange(2, 1, rowsToAdd.length, 6).setValues(rowsToAdd);\n  }\n}\n\nfunction readTableRows(ss, tabName) {\n  var sheet = ss.getSheetByName(tabName);\n  if (!sheet) return [];\n\n  var lastRow = sheet.getLastRow();\n  if (lastRow <= 1) return [];\n\n  // Ambil kolom RAW_DATA (kolom ke-5)\n  var rawDataCol = sheet.getRange(2, 5, lastRow - 1, 1).getValues();\n  var result = [];\n\n  for (var i = 0; i < rawDataCol.length; i++) {\n    var str = rawDataCol[i][0];\n    if (str) {\n      try {\n        result.push(JSON.parse(str));\n      } catch (e) {\n        // Fallback jika bukan JSON murni\n      }\n    }\n  }\n\n  return result;\n}\n\nfunction readAllTablesFromSpreadsheet(ss) {\n  var tables = ['surat_tugas', 'kwitansi_honor', 'laporan_survei', 'tariffs', 'grade_tariffs', 'admin_settings', 'master_kapal', 'users', 'visit_survei'];\n  var result = {};\n\n  for (var i = 0; i < tables.length; i++) {\n    var tbl = tables[i];\n    var rows = readTableRows(ss, tbl);\n    if (tbl === 'admin_settings') {\n      result[tbl] = rows.length > 0 ? rows[0] : null;\n    } else {\n      result[tbl] = rows;\n    }\n  }\n\n  return result;\n}\n\nfunction toCamelCase(str) {\n  return str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });\n}\n\n// ─── GOOGLE DRIVE ATTACHMENT HELPER FUNCTIONS ────────────────────────────────\n\nfunction handleUploadFileToDrive(payload) {\n  var rootFolderName = payload.rootFolder || \"BKI_DOKUMEN_SURAT\";\n  var year = payload.year || new Date().getFullYear().toString();\n  var month = payload.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || \"GMT+7\", \"MM-MMMM\");\n  var subFolder = payload.subFolder || \"UMUM\";\n  var category = payload.category || \"Dokumen_Lampiran\";\n\n  var fileName = payload.fileName || (\"file_\" + Date.now());\n  var mimeType = payload.mimeType || \"application/octet-stream\";\n  var base64Data = payload.base64Data || \"\";\n\n  if (!base64Data) {\n    return createJsonResponse({ success: false, message: \"Data file (base64) tidak ditemukan atau kosong.\" }, 400);\n  }\n\n  if (base64Data.indexOf(\",\") > -1) {\n    var parts = base64Data.split(\",\");\n    base64Data = parts[1];\n    if (parts[0].indexOf(\":\") > -1 && parts[0].indexOf(\";\") > -1) {\n      mimeType = parts[0].split(\":\")[1].split(\";\")[0] || mimeType;\n    }\n  }\n\n  var decodedBytes = Utilities.base64Decode(base64Data);\n  var decodedBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);\n\n  var targetFolder = getOrCreateFolderPath([rootFolderName, year, month, subFolder, category]);\n  var createdFile = targetFolder.createFile(decodedBlob);\n\n  try {\n    createdFile.setDescription(\"Diunggah via Sistem Surat Tugas BKI Pontianak pada \" + new Date().toLocaleString());\n  } catch (eDesc) {}\n\n  try {\n    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);\n  } catch (errSharing) {}\n\n  var fileId = createdFile.getId();\n  var viewUrl = \"https://drive.google.com/file/d/\" + fileId + \"/view?usp=sharing\";\n  var previewUrl = \"https://drive.google.com/file/d/\" + fileId + \"/preview\";\n  var directUrl = \"https://lh3.googleusercontent.com/d/\" + fileId;\n  var downloadUrl = \"https://drive.google.com/uc?export=download&id=\" + fileId;\n  var thumbnailUrl = \"https://lh3.googleusercontent.com/d/\" + fileId + \"=s800\";\n  var folderUrl = targetFolder.getUrl();\n\n  return createJsonResponse({\n    success: true,\n    fileId: fileId,\n    fileName: createdFile.getName(),\n    url: viewUrl,\n    viewUrl: viewUrl,\n    previewUrl: previewUrl,\n    directUrl: directUrl,\n    downloadUrl: downloadUrl,\n    thumbnailUrl: thumbnailUrl,\n    folderUrl: folderUrl,\n    folderName: targetFolder.getName(),\n    size: createdFile.getSize(),\n    mimeType: createdFile.getMimeType(),\n    storageProvider: \"gdrive\",\n    uploadedAt: new Date().toISOString()\n  });\n}\n\nfunction handleDeleteFileFromDrive(payload) {\n  var rawId = payload.fileId || payload.fileUrl || \"\";\n  if (!rawId) {\n    return createJsonResponse({ success: false, message: \"fileId atau URL tidak ditemukan\" }, 400);\n  }\n\n  var fileId = rawId;\n  var match = rawId.match(/\\/file\\/d\\/([a-zA-Z0-9_-]{20,})/) ||\n              rawId.match(/\\/d\\/([a-zA-Z0-9_-]{20,})/) ||\n              rawId.match(/id=([a-zA-Z0-9_-]{20,})/);\n  if (match && match[1]) {\n    fileId = match[1];\n  }\n\n  try {\n    var file = DriveApp.getFileById(fileId);\n    var fileName = file.getName();\n    file.setTrashed(true);\n    return createJsonResponse({\n      success: true,\n      message: \"File '\" + fileName + \"' berhasil dipindahkan ke Sampah Google Drive\",\n      fileId: fileId,\n      fileName: fileName\n    });\n  } catch (delErr) {\n    return createJsonResponse({\n      success: false,\n      message: \"Gagal menghapus file: \" + delErr.toString()\n    }, 500);\n  }\n}\n\nfunction getOrCreateFolderPath(folderNames) {\n  var currentFolder = DriveApp.getRootFolder();\n  for (var i = 0; i < folderNames.length; i++) {\n    var name = String(folderNames[i]).trim().replace(/[/\\\\?%*:|\"<>]/g, \"_\");\n    if (!name) continue;\n    var subFolders = currentFolder.getFoldersByName(name);\n    if (subFolders.hasNext()) {\n      currentFolder = subFolders.next();\n    } else {\n      currentFolder = currentFolder.createFolder(name);\n    }\n  }\n  return currentFolder;\n}\n\nfunction getDriveQuotaInfo() {\n  try {\n    var storageUsed = DriveApp.getStorageUsed();\n    var storageLimit = DriveApp.getStorageLimit();\n    return {\n      usedBytes: storageUsed,\n      limitBytes: storageLimit,\n      usedMB: Math.round(storageUsed / (1024 * 1024)),\n      limitMB: Math.round(storageLimit / (1024 * 1024))\n    };\n  } catch (e) {\n    return null;\n  }\n}\n\nfunction createJsonResponse(data, statusCode) {\n  return ContentService.createTextOutput(JSON.stringify(data))\n    .setMimeType(ContentService.MimeType.JSON);\n}\n";

export const SettingsTab = () => {
  const { currentUser, changePassword, verifyCurrentPassword, updateUser, usersList } = useAuth();
  const { adminSettings, updateAdminSettings, resetData, clearAllDataKeepSettings, suratTugas, kwitansiHonor, laporanSurvei, tariffs, gradeTariffs, masterKapal, visitSurvei } = useData();
  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false);

  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');

  const [profileInput, setProfileInput] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    signatureUrl: currentUser?.signatureUrl || ''
  });

  useEffect(() => {
    if (currentUser) {
      setProfileInput({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        signatureUrl: currentUser.signatureUrl || ''
      });
    }
  }, [currentUser]);

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [adminMsg, setAdminMsg] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [isUploadingKacabTtd, setIsUploadingKacabTtd] = useState(false);
  const [isUploadingPembuatTtd, setIsUploadingPembuatTtd] = useState(false);
  const [isUploadingUserTtd, setIsUploadingUserTtd] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Google Drive State
  const [gdriveConfig, setGdriveConfig] = useState(() => getGoogleDriveConfig());
  const [isTestingGDrive, setIsTestingGDrive] = useState(false);
  const [gdriveTestResult, setGdriveTestResult] = useState(null);
  const [showGDriveGuide, setShowGDriveGuide] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);

  // Hostinger MySQL State
  const [hostingerConfig, setHostingerConfig] = useState(() => getHostingerConfig());
  const [isTestingHostinger, setIsTestingHostinger] = useState(false);
  const [hostingerTestResult, setHostingerTestResult] = useState(null);
  const [isSyncingToHostinger, setIsSyncingToHostinger] = useState(false);
  const [hostingerStats, setHostingerStats] = useState(null);

  
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
          message: `Koneksi Berhasil & Data Tersinkronkan!\nGoogle Spreadsheet: ${result.spreadsheetUrl}`
        }));
      }
    } catch (err) {
      toast.error('Gagal sinkron ke Google Sheets: ' + err.message);
    } finally {
      setIsSyncingToSheets(false);
    }
  };

  const handleTestGDriveConnection = async () => {
    if (!gdriveConfig.webAppUrl) {
      toast.error('Masukkan Web App URL terlebih dahulu');
      return;
    }

    setIsTestingGDrive(true);
    setGdriveTestResult(null);

    try {
      const result = await testGoogleDriveConnection(gdriveConfig.webAppUrl);
      setGdriveTestResult({
        success: true,
        message: result.message,
        latencyMs: result.latencyMs
      });
      toast.success('Koneksi Google Drive Berhasil!');
    } catch (err) {
      setGdriveTestResult({
        success: false,
        message: err.message
      });
      toast.error(err.message || 'Gagal terhubung ke Google Drive');
    } finally {
      setIsTestingGDrive(false);
    }
  };

  const handleSaveGDriveConfig = () => {
    saveGoogleDriveConfig(gdriveConfig);
    toast.success('Pengaturan Google Drive berhasil disimpan!');
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GDRIVE_SCRIPT_CODE);
    setIsCopiedScript(true);
    toast.success('Kode Google Apps Script berhasil disalin!');
    setTimeout(() => setIsCopiedScript(false), 3000);
  };

  // ── Hostinger MySQL Handlers ──────────────────────────────────────────────
  const handleTestHostingerConnection = async () => {
    if (!hostingerConfig.apiUrl) {
      toast.error('Masukkan URL API Hostinger terlebih dahulu');
      return;
    }
    setIsTestingHostinger(true);
    setHostingerTestResult(null);
    try {
      const result = await testHostingerConnection(hostingerConfig.apiUrl);
      setHostingerTestResult({
        success: true,
        message: result.message,
        latencyMs: result.latencyMs,
        database: result.database
      });
      toast.success('Koneksi ke MySQL Hostinger berhasil!');
      // Fetch stats
      try {
        const stats = await fetchHostingerStats();
        if (stats) setHostingerStats(stats);
      } catch (e) {}
    } catch (err) {
      setHostingerTestResult({
        success: false,
        message: err.message
      });
      toast.error(err.message || 'Gagal terhubung ke Hostinger');
    } finally {
      setIsTestingHostinger(false);
    }
  };

  const handleSaveHostingerConfig = () => {
    saveHostingerConfig(hostingerConfig);
    toast.success('Pengaturan Database Hostinger berhasil disimpan!');
  };

  const handleSyncAllToHostinger = async () => {
    setIsSyncingToHostinger(true);
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
      const result = await syncAllToHostinger(fullData);
      if (result?.success) {
        toast.success(`Data berhasil disinkronkan ke MySQL Hostinger! (${result.totalSaved || 0} record)`);
        setHostingerTestResult({
          success: true,
          message: `Sinkronisasi berhasil! ${result.totalSaved || 0} record tersimpan di MySQL Hostinger.`
        });
        setHostingerConfig(prev => ({ ...prev, lastSync: new Date().toISOString(), lastSyncStatus: 'success' }));
        // Refresh stats
        try {
          const stats = await fetchHostingerStats();
          if (stats) setHostingerStats(stats);
        } catch (e) {}
      } else {
        toast.error('Gagal sinkron: ' + (result?.message || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Gagal sinkron ke MySQL: ' + err.message);
      setHostingerConfig(prev => ({ ...prev, lastSyncStatus: 'error' }));
    } finally {
      setIsSyncingToHostinger(false);
    }
  };

  const [signatoryInput, setSignatoryInput] = useState({
    kepalaCabang: adminSettings?.kepalaCabang || 'MUHSON NURROCHMAT',
    nup: adminSettings?.nup || '48199-KI',
    pembuatDaftar: adminSettings?.pembuatDaftar || 'RENZA MUHARAM',
    nupPembuatDaftar: adminSettings?.nupPembuatDaftar || '50382-KI',
    keteranganLain: adminSettings?.keteranganLain || 'BIAYA DITANGGUNG SEPENUHNYA OLEH PT.BIRO KLASIFIKASI INDONESIA (Persero) CAB.MADYA KLAS PONTIANAK',
    tembusan: adminSettings?.tembusan || '1. Yth. Kepala Divisi keuangan\nC:/surat tugas kacab/~srt/2026',
    kacabSignatureUrl: adminSettings?.kacabSignatureUrl || '',
    pembuatSignatureUrl: adminSettings?.pembuatSignatureUrl || ''
  });

  const handleSaveAdminSettings = (e) => {
    e.preventDefault();
    updateAdminSettings(signatoryInput);
    setAdminMsg('Pengaturan Penandatangan dan TTD Digital berhasil disimpan!');
    setTimeout(() => setAdminMsg(''), 4000);
  };

  const handleKacabSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingKacabTtd(true);
    try {
      const dataUrl = await fileToSignatureDataUrl(file);
      setSignatoryInput((prev) => ({
        ...prev,
        kacabSignatureUrl: dataUrl
      }));
      toast.success('TTD Kepala Cabang berhasil diunggah!');
    } catch (err) {
      console.error('Upload TTD Kacab failed:', err);
      toast.error('Gagal memproses berkas TTD Kepala Cabang.');
    } finally {
      setIsUploadingKacabTtd(false);
      e.target.value = '';
    }
  };

  const handlePembuatSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPembuatTtd(true);
    try {
      const dataUrl = await fileToSignatureDataUrl(file);
      setSignatoryInput((prev) => ({
        ...prev,
        pembuatSignatureUrl: dataUrl
      }));
      toast.success('TTD Pembuat Daftar berhasil diunggah!');
    } catch (err) {
      console.error('Upload TTD Pembuat failed:', err);
      toast.error('Gagal memproses berkas TTD Pembuat Daftar.');
    } finally {
      setIsUploadingPembuatTtd(false);
      e.target.value = '';
    }
  };

  const handleUserSignatureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingUserTtd(true);
    try {
      const dataUrl = await fileToSignatureDataUrl(file);
      setProfileInput((prev) => ({
        ...prev,
        signatureUrl: dataUrl
      }));
      toast.success('TTD Digital berhasil diunggah! Klik Simpan untuk memperbarui database.');
    } catch (err) {
      console.error('Upload TTD failed:', err);
      toast.error('Gagal memproses berkas TTD Digital.');
    } finally {
      setIsUploadingUserTtd(false);
      e.target.value = '';
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setMessage({ type: '', text: '' });
    try {
      await updateUser(currentUser.id, profileInput);
      setMessage({ type: 'success', text: 'Profil dan database berhasil diperbarui secara otomatis!' });
      toast.success('Profil & Database berhasil diperbarui!');
    } catch (err) {
      console.error('Update profile error:', err);
      setMessage({ type: 'error', text: 'Gagal memperbarui profil di database.' });
      toast.error('Gagal memperbarui profil di database.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPassInput) {
      setMessage({ type: 'error', text: 'Masukkan password saat ini!' });
      return;
    }

    setIsSubmittingPass(true);

    try {
      const isCurrentValid = await verifyCurrentPassword(currentPassInput);
      if (!isCurrentValid) {
        setMessage({ type: 'error', text: 'Password saat ini yang Anda masukkan salah!' });
        setIsSubmittingPass(false);
        return;
      }

      const strength = validatePasswordStrength(newPassInput);
      if (!strength.isValid) {
        setMessage({
          type: 'error',
          text: `Password baru tidak memenuhi syarat keamanan: ${strength.errors.join(', ')}`
        });
        setIsSubmittingPass(false);
        return;
      }

      if (newPassInput !== confirmPassInput) {
        setMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok!' });
        setIsSubmittingPass(false);
        return;
      }

      await changePassword(currentUser.id, newPassInput);
      setMessage({ type: 'success', text: 'Password Anda berhasil diperbarui dengan enkripsi aman!' });

      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmPassInput('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal memperbarui password. Silakan coba lagi.' });
    } finally {
      setIsSubmittingPass(false);
    }
  };

  const handleConfirmResetDemo = async () => {
    try {
      await resetData();
      setIsResetConfirmOpen(false);
      toast.success('Data SPS, PDS, Laporan, dan Kwitansi berhasil direset! (Data Tarif, User, dan Kapal tetap tersimpan)');
    } catch (error) {
      toast.error('Gagal mereset data. Silakan coba lagi.');
      console.error('Reset data error:', error);
    }
  };

  const handleConfirmClearData = async () => {
    try {
      await clearAllDataKeepSettings();
      setIsClearDataConfirmOpen(false);
      toast.success('Semua data berhasil dihapus! Tarif, Grade, dan Pengaturan Admin tetap tersimpan.');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Gagal menghapus data. Silakan coba lagi.');
      console.error('Clear data error:', error);
    }
  };

  const passValidation = validatePasswordStrength(newPassInput);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Profile Settings Box */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <User size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Profil Pengguna</h3>
              <div className="card-subtitle">
                Perbarui informasi nama, kontak, dan TTD digital akun Anda (otomatis tersinkron ke database)
              </div>
            </div>
          </div>
        </div>

        {message.text && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#dc2626',
              fontWeight: 700,
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        {/* User Role & Grade Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.35rem 0.65rem' }}>
            👤 Username: <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.username || '-'}</strong>
          </span>
          <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.25)', color: '#0284c7', padding: '0.35rem 0.65rem' }}>
            🎖️ Peran: <strong style={{ textTransform: 'capitalize' }}>{currentUser?.role || 'Surveyor'}</strong>
          </span>
          {currentUser?.grade && (
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#059669', padding: '0.35rem 0.65rem' }}>
              ⭐ Grade: <strong>{currentUser.grade}</strong>
            </span>
          )}
        </div>

        <form onSubmit={handleUpdateProfile} style={{ maxWidth: '560px' }}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              className="form-input"
              value={profileInput.name}
              onChange={(e) => setProfileInput({ ...profileInput, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Alamat Email</label>
              <input
                type="email"
                className="form-input"
                value={profileInput.email}
                onChange={(e) => setProfileInput({ ...profileInput, email: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nomor Telepon</label>
              <input
                type="text"
                className="form-input"
                value={profileInput.phone}
                onChange={(e) => setProfileInput({ ...profileInput, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Tanda Tangan Digital Akun */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Tanda Tangan Digital (TTD)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '180px',
                  height: '80px',
                  border: '1.5px dashed var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  overflow: 'hidden'
                }}
              >
                {isValidSignature(profileInput.signatureUrl) ? (
                  <img
                    src={profileInput.signatureUrl}
                    alt="TTD Akun"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Belum ada TTD</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isUploadingUserTtd ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                  <span>{isUploadingUserTtd ? 'Mengunggah...' : 'Unggah TTD Baru'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleUserSignatureUpload}
                    disabled={isUploadingUserTtd}
                  />
                </label>
                {isValidSignature(profileInput.signatureUrl) && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => setProfileInput({ ...profileInput, signatureUrl: '' })}
                  >
                    <Trash2 size={13} />
                    <span>Hapus TTD</span>
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Format PNG transparan disarankan. TTD ini digunakan saat mencetak surat tugas & dokumen resmi.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSavingProfile}
            style={{ marginTop: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            {isSavingProfile ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
            <span>{isSavingProfile ? 'Menyimpan ke Database...' : 'Simpan Perubahan Profil'}</span>
          </button>
        </form>
      </div>

      {/* Password Settings Box */}
      <div className="card-section" style={{ padding: '1.75rem' }}>
        <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
          <div className="card-title-group">
            <KeyRound size={22} color="var(--accent-primary)" />
            <div>
              <h3 className="card-title">Ganti Password</h3>
              <div className="card-subtitle">Perbarui password akun Anda secara berkala untuk menjaga keamanan sistem</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} style={{ maxWidth: '480px' }}>
          <div className="form-group">
            <label className="form-label">Password Saat Ini *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPass ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={currentPassInput}
                onChange={(e) => setCurrentPassInput(e.target.value)}
                placeholder="Masukkan password saat ini..."
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password Baru *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPass ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                placeholder="Minimal 6 karakter..."
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Konfirmasi Password Baru *</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassInput}
              onChange={(e) => setConfirmPassInput(e.target.value)}
              placeholder="Ulangi password baru..."
              required
            />
          </div>

          {newPassInput && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                <span>Kekuatan Password:</span>
                <span style={{ color: passValidation.color }}>{passValidation.label}</span>
              </div>
              <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(passValidation.score / 4) * 100}%`, background: passValidation.color, transition: 'all 0.3s' }} />
              </div>
              {!passValidation.isValid && (
                <div style={{ fontSize: '0.725rem', color: '#dc2626', marginTop: '0.35rem' }}>
                  Kekurangan: {passValidation.errors.join(' • ')}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmittingPass}
            style={{ marginTop: '0.5rem', opacity: isSubmittingPass ? 0.6 : 1 }}
          >
            <Check size={16} />
            <span>{isSubmittingPass ? 'Memproses Enkripsi...' : 'Simpan Password Baru'}</span>
          </button>
        </form>
      </div>

      {/* Admin Signatory & Digital Signature Settings Box */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <FileCheck2 size={22} color="var(--accent-primary)" />
              <div>
                <h3 className="card-title">Pengaturan Format Cetak & Tanda Tangan Digital (TTD)</h3>
                <div className="card-subtitle">Upload scan TTD Kepala Cabang dan Pembuat Daftar untuk otomatis disematkan pada dokumen SPS & PDS</div>
              </div>
            </div>
          </div>

          {adminMsg && (
            <div style={{ padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', background: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>
              ✅ {adminMsg}
            </div>
          )}

          <form onSubmit={handleSaveAdminSettings} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Kepala Cabang *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.kepalaCabang}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, kepalaCabang: e.target.value })}
                  placeholder="Contoh: MUHSON NURROCHMAT"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NUP Kepala Cabang *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.nup}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, nup: e.target.value })}
                  placeholder="Contoh: 48199-KI"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.25rem' }}>
              <div className="form-group">
                <label className="form-label">Nama Pembuat Daftar *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.pembuatDaftar}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, pembuatDaftar: e.target.value })}
                  placeholder="Contoh: RENZA MUHARAM"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">NUP Pembuat Daftar *</label>
                <input
                  type="text"
                  className="form-input"
                  value={signatoryInput.nupPembuatDaftar}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, nupPembuatDaftar: e.target.value })}
                  placeholder="Contoh: 50382-KI"
                  required
                />
              </div>
            </div>

            {/* UPLOAD SCAN TTD KEPALA CABANG & PEMBUAT DAFTAR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
              {/* TTD KEPALA CABANG */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                  ✍️ Scan TTD Kepala Cabang
                </label>
                {isValidSignature(signatoryInput.kacabSignatureUrl) ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', position: 'relative' }}>
                      <img
                        src={signatoryInput.kacabSignatureUrl}
                        alt="TTD Kacab"
                        style={{ maxHeight: '54px', maxWidth: '140px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const errBox = document.getElementById('kacab-ttd-err');
                          if (errBox) errBox.style.display = 'block';
                        }}
                      />
                      <span id="kacab-ttd-err" style={{ display: 'none', fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ Gambar rusak / tidak dapat dimuat. Silakan upload ulang.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', textAlign: 'center', margin: 0, fontSize: '0.75rem' }}>
                        <Upload size={13} />
                        <span>{isUploadingKacabTtd ? 'Mengunggah...' : 'Ganti TTD'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleKacabSignatureUpload}
                          disabled={isUploadingKacabTtd}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSignatoryInput({ ...signatoryInput, kacabSignatureUrl: '' })}
                        style={{ color: '#dc2626', fontSize: '0.75rem' }}
                        title="Hapus TTD"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', padding: '0.5rem' }}>
                    <Upload size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      {isUploadingKacabTtd ? 'Mengunggah...' : 'Upload TTD Kacab'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PNG / JPG transparan</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleKacabSignatureUpload}
                      disabled={isUploadingKacabTtd}
                    />
                  </label>
                )}
              </div>

              {/* TTD PEMBUAT DAFTAR */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1.5px dashed #cbd5e1' }}>
                <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem', display: 'block' }}>
                  ✍️ Scan TTD Pembuat Daftar
                </label>
                {isValidSignature(signatoryInput.pembuatSignatureUrl) ? (
                  <div>
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', position: 'relative' }}>
                      <img
                        src={signatoryInput.pembuatSignatureUrl}
                        alt="TTD Pembuat"
                        style={{ maxHeight: '54px', maxWidth: '140px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const errBox = document.getElementById('pembuat-ttd-err');
                          if (errBox) errBox.style.display = 'block';
                        }}
                      />
                      <span id="pembuat-ttd-err" style={{ display: 'none', fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, textAlign: 'center' }}>
                        ⚠️ Gambar rusak / tidak dapat dimuat. Silakan upload ulang.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', textAlign: 'center', margin: 0, fontSize: '0.75rem' }}>
                        <Upload size={13} />
                        <span>{isUploadingPembuatTtd ? 'Mengunggah...' : 'Ganti TTD'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handlePembuatSignatureUpload}
                          disabled={isUploadingPembuatTtd}
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSignatoryInput({ ...signatoryInput, pembuatSignatureUrl: '' })}
                        style={{ color: '#dc2626', fontSize: '0.75rem' }}
                        title="Hapus TTD"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '90px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'center', padding: '0.5rem' }}>
                    <Upload size={18} color="var(--accent-primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem' }}>
                      {isUploadingPembuatTtd ? 'Mengunggah...' : 'Upload TTD Pembuat'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PNG / JPG transparan</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePembuatSignatureUpload}
                      disabled={isUploadingPembuatTtd}
                    />
                  </label>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Keterangan Lain (Pembiayaan) *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={signatoryInput.keteranganLain}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, keteranganLain: e.target.value })}
                  placeholder="Catatan pembiayaan BKI..."
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tembusan *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={signatoryInput.tembusan}
                  onChange={(e) => setSignatoryInput({ ...signatoryInput, tembusan: e.target.value })}
                  placeholder="Contoh: 1. Yth. Kepala Divisi keuangan..."
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
              <Check size={16} />
              <span>Simpan Pengaturan Cetak & TTD</span>
            </button>
          </form>
        </div>
      )}

      {/* GOOGLE WORKSPACE INTEGRATION SETTINGS (ADMIN, KACAB, DEVELOPER) */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer' || currentUser?.role === 'kacab') && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <HardDrive size={22} color="var(--accent-primary)" />
              <div>
                <h3 className="card-title">Integrasi Google Workspace (Google Drive & Google Sheets Database)</h3>
                <div className="card-subtitle">
                  Google Sheets digunakan sebagai Database penyimpanan seluruh data operasional (SPS, PDS, Kwitansi, Laporan, Tarif, Kapal), dan Google Drive digunakan untuk penyimpanan berkas lampiran (PDF, Foto, Bukti).
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  Aktifkan Integrasi Google Workspace (Drive & Sheets)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {gdriveConfig.enabled
                    ? '🟢 Berkas lampiran otomatis disimpan ke Google Drive & data disinkronkan ke Google Sheets'
                    : '⚪ Penyimpanan menggunakan mode lokal'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={gdriveConfig.enabled}
                  onChange={(e) => {
                    const newCfg = { ...gdriveConfig, enabled: e.target.checked };
                    setGdriveConfig(newCfg);
                    saveGoogleDriveConfig(newCfg);
                    toast.success(e.target.checked ? 'Google Drive & Sheets diaktifkan!' : 'Google Drive & Sheets dinonaktifkan.');
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: gdriveConfig.enabled ? 'var(--accent-primary)' : '#cbd5e1',
                    transition: '.2s',
                    borderRadius: '26px'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '20px',
                      width: '20px',
                      left: gdriveConfig.enabled ? '25px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.2s',
                      borderRadius: '50%'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Config Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Google Apps Script Web App URL *
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={gdriveConfig.webAppUrl}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, webAppUrl: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  URL Web App yang diperoleh setelah menerapkan (*deploy*) script di Google Apps Script.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Nama Folder Utama di Drive
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="BKI_DOKUMEN_SURAT"
                  value={gdriveConfig.rootFolder}
                  onChange={(e) => setGdriveConfig({ ...gdriveConfig, rootFolder: e.target.value })}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Folder akan dibuat otomatis di Google Drive utama Anda.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
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
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestGDriveConnection}
                  disabled={isTestingGDrive || !gdriveConfig.webAppUrl}
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.82rem' }}
                >
                  {isTestingGDrive ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} color="#eab308" />
                      <span>Tes Koneksi Drive</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveGDriveConfig}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
                >
                  <Check size={15} />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            {/* Test Result Indicator */}
            {gdriveTestResult && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: gdriveTestResult.success ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${gdriveTestResult.success ? '#a7f3d0' : '#fecaca'}`,
                  color: gdriveTestResult.success ? '#065f46' : '#991b1b'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {gdriveTestResult.success ? <CheckCircle2 size={18} color="#059669" /> : <AlertCircle size={18} color="#dc2626" />}
                  <div style={{ flex: 1 }}>
                    <strong>{gdriveTestResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</strong>
                    {gdriveTestResult.latencyMs && (
                      <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '0.4rem' }}>
                        ({gdriveTestResult.latencyMs} ms)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', whiteSpace: 'pre-line', lineHeight: '1.45', paddingLeft: '1.6rem' }}>
                  {gdriveTestResult.message}
                </div>

                {!gdriveTestResult.success && gdriveConfig.webAppUrl && (
                  <div style={{ paddingLeft: '1.6rem', marginTop: '0.25rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => window.open(gdriveConfig.webAppUrl, '_blank')}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderColor: '#fca5a5', color: '#991b1b' }}
                    >
                      <ExternalLink size={12} /> Buka URL Script di Tab Baru
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Guide & Script Template Accordion */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  background: '#f1f5f9'
                }}
                onClick={() => setShowGDriveGuide(!showGDriveGuide)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                  <HelpCircle size={16} color="var(--accent-primary)" />
                  <span>Panduan Cepat Setup Google Apps Script (2 Menit)</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {showGDriveGuide ? 'Tutup Panduan ▲' : 'Buka Panduan ▼'}
                </span>
              </div>

              {showGDriveGuide && (
                <div style={{ padding: '1rem', fontSize: '0.82rem', lineHeight: '1.5', color: '#334155' }}>
                  <ol style={{ paddingLeft: '1.2rem', margin: '0 0 1rem 0' }}>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Buka <strong><a href="https://script.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>Google Apps Script (script.google.com)</a></strong> dengan akun Google kantor / pribadi Anda.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik <strong>"New project" (Proyek baru)</strong>, lalu hapus semua kode di editor.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Salin kode di bawah ini lalu tempelkan (*paste*) ke editor Google Apps Script.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik tombol biru <strong>"Deploy"</strong> di pojok kanan atas &gt; <strong>"New deployment"</strong>.
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Pilih tipe <strong>"Web app"</strong>:
                      <ul style={{ margin: '0.2rem 0', paddingLeft: '1.2rem' }}>
                        <li><strong>Execute as:</strong> <code>Me (Akun Anda)</code></li>
                        <li><strong>Who has access:</strong> <code>Anyone (Siapa saja)</code></li>
                      </ul>
                    </li>
                    <li style={{ marginBottom: '0.35rem' }}>
                      Klik <strong>"Deploy"</strong>, izinkan akses akun, lalu salin <strong>Web app URL</strong> yang dihasilkan dan tempelkan ke kolom URL di atas!
                    </li>
                  </ol>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#475569' }}>
                      Kode Google Apps Script (Code.gs):
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyScriptCode}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {isCopiedScript ? (
                        <>
                          <CheckCheck size={14} color="#059669" />
                          <span style={{ color: '#059669', fontWeight: 600 }}>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Salin Kode Script</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre
                    style={{
                      background: '#0f172a',
                      color: '#e2e8f0',
                      padding: '0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      margin: 0
                    }}
                  >
                    {GDRIVE_SCRIPT_CODE}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HOSTINGER MYSQL DATABASE INTEGRATION (ADMIN, KACAB, DEVELOPER) */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'developer' || currentUser?.role === 'kacab') && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <Server size={22} color="#8b5cf6" />
              <div>
                <h3 className="card-title">Database MySQL Hostinger</h3>
                <div className="card-subtitle">
                  Sinkronisasi data ke database MySQL di Hostinger sebagai database tambahan (dual sync bersama Google Sheets).
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                  Aktifkan Sinkronisasi MySQL Hostinger
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {hostingerConfig.enabled
                    ? '🟢 Data otomatis disinkronkan ke MySQL Hostinger (dual sync)'
                    : '⚪ Hanya menggunakan Google Sheets sebagai database cloud'}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hostingerConfig.enabled}
                  onChange={(e) => {
                    const newCfg = { ...hostingerConfig, enabled: e.target.checked };
                    setHostingerConfig(newCfg);
                    saveHostingerConfig(newCfg);
                    toast.success(e.target.checked ? 'MySQL Hostinger diaktifkan!' : 'MySQL Hostinger dinonaktifkan.');
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: hostingerConfig.enabled ? '#8b5cf6' : '#cbd5e1',
                    transition: '.2s',
                    borderRadius: '26px'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '20px', width: '20px',
                      left: hostingerConfig.enabled ? '25px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '.2s',
                      borderRadius: '50%'
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Config Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  URL API Hostinger *
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://domain-anda.com/api/api.php"
                  value={hostingerConfig.apiUrl}
                  onChange={(e) => setHostingerConfig({ ...hostingerConfig, apiUrl: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  URL file api.php yang sudah di-upload ke hosting Hostinger Anda (contoh: https://domain.com/api/api.php)
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSyncAllToHostinger}
                  disabled={isSyncingToHostinger || !hostingerConfig.apiUrl || !hostingerConfig.enabled}
                  style={{ padding: '0.65rem 1rem', fontSize: '0.82rem', borderColor: '#8b5cf6', color: '#5b21b6', background: '#f5f3ff' }}
                  title="Kirim seluruh data lokal ke MySQL Hostinger"
                >
                  {isSyncingToHostinger ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Sinkronisasi...</span>
                    </>
                  ) : (
                    <>
                      <Database size={15} color="#8b5cf6" />
                      <span>Kirim Data ke MySQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTestHostingerConnection}
                  disabled={isTestingHostinger || !hostingerConfig.apiUrl}
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.82rem' }}
                >
                  {isTestingHostinger ? (
                    <>
                      <Loader2 size={15} className="spin-icon" />
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} color="#eab308" />
                      <span>Tes Koneksi MySQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveHostingerConfig}
                  style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem', background: '#8b5cf6', borderColor: '#8b5cf6' }}
                >
                  <Check size={15} />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            {/* Test Result Indicator */}
            {hostingerTestResult && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  background: hostingerTestResult.success ? '#f5f3ff' : '#fef2f2',
                  border: `1px solid ${hostingerTestResult.success ? '#c4b5fd' : '#fecaca'}`,
                  color: hostingerTestResult.success ? '#5b21b6' : '#991b1b'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {hostingerTestResult.success ? <CheckCircle2 size={18} color="#8b5cf6" /> : <AlertCircle size={18} color="#dc2626" />}
                  <div style={{ flex: 1 }}>
                    <strong>{hostingerTestResult.success ? 'Koneksi MySQL Berhasil!' : 'Koneksi Gagal'}</strong>
                    {hostingerTestResult.latencyMs && (
                      <span style={{ fontSize: '0.72rem', opacity: 0.8, marginLeft: '0.4rem' }}>
                        ({hostingerTestResult.latencyMs} ms)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', whiteSpace: 'pre-line', lineHeight: '1.45', paddingLeft: '1.6rem' }}>
                  {hostingerTestResult.message}
                </div>
                {hostingerTestResult.database && (
                  <div style={{ fontSize: '0.74rem', paddingLeft: '1.6rem', opacity: 0.85 }}>
                    Database: <strong>{hostingerTestResult.database}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            {hostingerStats && hostingerStats.stats && (
              <div style={{ padding: '0.85rem 1rem', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#5b21b6', marginBottom: '0.5rem' }}>
                  📊 Statistik MySQL Hostinger ({hostingerStats.total || 0} total record)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.35rem', fontSize: '0.76rem', color: '#4c1d95' }}>
                  {Object.entries(hostingerStats.stats).map(([tbl, cnt]) => (
                    <div key={tbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0.4rem', background: '#ede9fe', borderRadius: '4px' }}>
                      <span>{tbl}</span>
                      <strong>{cnt}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Sync Info */}
            {hostingerConfig.lastSync && (
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                Sinkronisasi terakhir: <strong>{new Date(hostingerConfig.lastSync).toLocaleString('id-ID')}</strong>
                {hostingerConfig.lastSyncStatus === 'success' && <span style={{ color: '#059669', marginLeft: '0.5rem' }}>✅ Berhasil</span>}
                {hostingerConfig.lastSyncStatus === 'error' && <span style={{ color: '#dc2626', marginLeft: '0.5rem' }}>❌ Gagal</span>}
              </div>
            )}

            {/* Setup Guide */}
            <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', lineHeight: '1.5', color: '#4c1d95' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>📋 Panduan Setup Hostinger:</div>
              <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                <li style={{ marginBottom: '0.3rem' }}>Buat database MySQL di <strong>hPanel Hostinger → Database → MySQL Databases</strong></li>
                <li style={{ marginBottom: '0.3rem' }}>Edit file <code>config.php</code> di folder <code>hostinger-api/</code> — isi Host, Database, Username, Password</li>
                <li style={{ marginBottom: '0.3rem' }}>Upload folder <code>hostinger-api/</code> (config.php, api.php, setup.php, .htaccess) ke <code>public_html/api/</code> di Hostinger</li>
                <li style={{ marginBottom: '0.3rem' }}>Buka <code>https://domain.com/api/setup.php</code> untuk membuat tabel otomatis</li>
                <li style={{ marginBottom: '0.3rem' }}>Masukkan URL API <code>https://domain.com/api/api.php</code> di kolom di atas, lalu klik Simpan</li>
                <li>Klik "Tes Koneksi" dan "Kirim Data ke MySQL" untuk sinkronisasi awal</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Developer Maintenance Box */}
      {currentUser?.role === 'developer' && (
        <div className="card-section" style={{ padding: '1.75rem' }}>
          <div className="card-header" style={{ padding: 0, marginBottom: '1.25rem', border: 'none' }}>
            <div className="card-title-group">
              <Shield size={22} color="#dc2626" />
              <div>
                <h3 className="card-title" style={{ color: '#dc2626' }}>Pemeliharaan Sistem & Reset Data</h3>
                <div className="card-subtitle">Kembalikan seluruh akun pengguna dan data ke status awal (Akses Khusus Developer)</div>
              </div>
            </div>
          </div>

          <button className="btn btn-danger" onClick={() => setIsResetConfirmOpen(true)}>
            <RotateCcw size={16} />
            <span>Reset Seluruh Data</span>
          </button>

          <div style={{ marginTop: '0.75rem', padding: '1rem', background: '#fef3c7', border: '1.5px solid #fde68a', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Database size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#92400e', marginBottom: '0.3rem' }}>
                  Hapus Semua Data (Simpan Tarif & Settings)
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350f', lineHeight: '1.4' }}>
                  Menghapus semua Surat Tugas, Laporan, dan Kwitansi. Data Tarif, Grade, dan Pengaturan Admin TIDAK AKAN TERHAPUS.
                </div>
              </div>
            </div>
            <button 
              className="btn btn-warning" 
              onClick={() => setIsClearDataConfirmOpen(true)}
              style={{ width: '100%', background: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' }}
            >
              <Trash2 size={16} />
              <span>Hapus Data (Simpan Tarif & Settings)</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetDemo}
        title="Konfirmasi Reset Data"
        message="Tindakan ini akan menghapus semua data Surat Tugas (SPS & PDS), Laporan BKI, Kwitansi, dan Lampiran dari sistem lokal & Cloud. Data Manajemen Tarif, Manajemen User, dan Database Kapal TIDAK AKAN DIHAPUS. Masukkan password developer Anda untuk melanjutkan."
        confirmText="Ya, Reset Semua Data"
        type="danger"
        requirePassword={true}
      />

      <ConfirmModal
        isOpen={isClearDataConfirmOpen}
        onClose={() => setIsClearDataConfirmOpen(false)}
        onConfirm={handleConfirmClearData}
        title="Konfirmasi Hapus Semua Data"
        message="Tindakan ini akan menghapus SEMUA Surat Tugas, Laporan Survei, dan Kwitansi dari sistem. Data Tarif, Grade Tariff, dan Pengaturan Admin TIDAK AKAN TERHAPUS. Apakah Anda yakin?"
        confirmText="Ya, Hapus Semua Data"
        type="danger"
        requirePassword={false}
      />
    </div>
  );
};
