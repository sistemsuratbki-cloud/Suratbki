/**
 * Google Apps Script Web App — Sistem Surat Tugas BKI Pontianak
 * 
 * INTEGRASI DUA-DALAM-SATU:
 * 1. GOOGLE SHEETS DATABASE — Menyimpan semua data tabel (SPS/PDS, Kwitansi, Laporan, Tarif, Kapal, dll)
 * 2. GOOGLE DRIVE STORAGE   — Menyimpan semua berkas lampiran (PDF Tiket, Kwitansi Hotel, Foto Survei)
 * 
 * =========================================================================
 * PANDUAN PENERAPAN (DEPLOY) DI GOOGLE APPS SCRIPT:
 * =========================================================================
 * 1. Buka https://script.google.com/
 * 2. Buka proyek "BKI Drive Service" (atau buat proyek baru).
 * 3. Hapus SEMUA isi Code.gs lama, lalu tempelkan (PASTE) seluruh kode ini.
 * 4. Klik ikon Disket (Save / Simpan).
 * 5. Klik tombol biru "Deploy" (Terapkan) di kanan atas -> pilih "Manage deployments".
 * 6. Klik ikon Pensil (Edit) -> pada Version pilih "New version" (Versi Baru).
 *    Pastikan "Who has access" disetel ke "Anyone" (Siapa saja).
 * 7. Klik "Deploy".
 * =========================================================================
 */

var DB_SPREADSHEET_NAME = "DATABASE_SURAT_BKI_PONTIANAK";

// ─── HTTP GET ─────────────────────────────────────────────────────────────────
function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) || "";
  var action = (e && e.parameter && e.parameter.action) || "ping";

  var responseData = {};

  try {
    if (action === "getAllData" || action === "readAll") {
      var db = getOrCreateDatabaseSpreadsheet();
      var allData = readAllTablesFromSpreadsheet(db);
      responseData = {
        success: true,
        data: allData,
        spreadsheetUrl: db.getUrl(),
        timestamp: new Date().toISOString()
      };
    } else if (action === "readTable") {
      var tableName = e.parameter.table || "surat_tugas";
      var dbSheet = getOrCreateDatabaseSpreadsheet();
      var rows = readTableRows(dbSheet, tableName);
      responseData = {
        success: true,
        table: tableName,
        data: rows,
        timestamp: new Date().toISOString()
      };
    } else {
      // Default: Ping
      var activeUser = "";
      try { activeUser = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(); } catch (err) {}
      var dbSpreadsheet = getOrCreateDatabaseSpreadsheet();
      responseData = {
        success: true,
        message: "Google Workspace API (Drive + Sheets) BKI Pontianak aktif dan siap digunakan!",
        action: action,
        userEmail: activeUser || "sistemsuratbki@gmail.com",
        spreadsheetUrl: dbSpreadsheet.getUrl(),
        spreadsheetId: dbSpreadsheet.getId(),
        quotaRemaining: getDriveQuotaInfo(),
        timestamp: new Date().toISOString()
      };
    }
  } catch (err) {
    responseData = {
      success: false,
      message: "Error doGet: " + err.toString()
    };
  }

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(responseData) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── HTTP POST ────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var payload = {};

    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || "ping";

    // 1. PING / TEST KONEKSI
    if (action === "ping") {
      var userEmail = "";
      try { userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(); } catch (err) {}
      var ss = getOrCreateDatabaseSpreadsheet();
      return createJsonResponse({
        success: true,
        message: "Koneksi ke Google Drive & Google Sheets BKI berhasil terhubung!",
        userEmail: userEmail || "sistemsuratbki@gmail.com",
        spreadsheetUrl: ss.getUrl(),
        quota: getDriveQuotaInfo(),
        timestamp: new Date().toISOString()
      });
    }

    // 2. GET ALL DATA (DATABASE GOOGLE SHEETS)
    if (action === "getAllData" || action === "readAll") {
      var dbAll = getOrCreateDatabaseSpreadsheet();
      var dataObj = readAllTablesFromSpreadsheet(dbAll);
      return createJsonResponse({
        success: true,
        data: dataObj,
        spreadsheetUrl: dbAll.getUrl(),
        timestamp: new Date().toISOString()
      });
    }

    // 3. SAVE SINGLE ITEM (UPSERT ITEM KE SHEET TAB TERTENTU)
    if (action === "saveItem") {
      var targetTable = payload.table;
      var itemData = payload.data;
      if (!targetTable || !itemData || !itemData.id) {
        return createJsonResponse({ success: false, message: "Parameter 'table' dan 'data.id' wajib diisi." }, 400);
      }

      var dbSave = getOrCreateDatabaseSpreadsheet();
      upsertItemToSheet(dbSave, targetTable, itemData);

      return createJsonResponse({
        success: true,
        message: "Item " + itemData.id + " berhasil disimpan ke Google Sheets [" + targetTable + "]",
        table: targetTable,
        id: itemData.id
      });
    }

    // 4. DELETE ITEM DARI GOOGLE SHEET
    if (action === "deleteItem") {
      var delTable = payload.table;
      var delId = payload.id;
      if (!delTable || !delId) {
        return createJsonResponse({ success: false, message: "Parameter 'table' dan 'id' wajib diisi." }, 400);
      }

      var dbDel = getOrCreateDatabaseSpreadsheet();
      deleteItemFromSheet(dbDel, delTable, delId);

      return createJsonResponse({
        success: true,
        message: "Item " + delId + " berhasil dihapus dari Google Sheets [" + delTable + "]"
      });
    }

    // 5. SYNC ALL DATA (MASSAL KE GOOGLE SHEETS)
    if (action === "syncAll") {
      var fullData = payload.data || {};
      var dbSync = getOrCreateDatabaseSpreadsheet();

      var tables = ['surat_tugas', 'kwitansi_honor', 'laporan_survei', 'tariffs', 'grade_tariffs', 'admin_settings', 'master_kapal', 'users', 'visit_survei'];
      var stats = {};

      for (var i = 0; i < tables.length; i++) {
        var tbl = tables[i];
        var rows = fullData[tbl] || fullData[toCamelCase(tbl)] || [];
        if (Array.isArray(rows) && rows.length > 0) {
          syncTableBatch(dbSync, tbl, rows);
          stats[tbl] = rows.length;
        } else if (tbl === 'admin_settings' && fullData[tbl] && typeof fullData[tbl] === 'object') {
          syncTableBatch(dbSync, tbl, [fullData[tbl]]);
          stats[tbl] = 1;
        }
      }

      return createJsonResponse({
        success: true,
        message: "Seluruh data berhasil disinkronkan ke Google Sheets!",
        stats: stats,
        spreadsheetUrl: dbSync.getUrl()
      });
    }

    // 6. UPLOAD FILE KE GOOGLE DRIVE
    if (action === "uploadFile" || action === "upload") {
      return handleUploadFileToDrive(payload);
    }

    // 7. HAPUS FILE DARI GOOGLE DRIVE
    if (action === "deleteFile" || action === "delete") {
      return handleDeleteFileFromDrive(payload);
    }

    return createJsonResponse({
      success: false,
      message: "Aksi '" + action + "' tidak dikenali oleh Google Workspace API."
    }, 400);

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: "Terjadi kesalahan server: " + error.toString()
    }, 500);
  }
}

// ─── GOOGLE SHEETS HELPER FUNCTIONS ──────────────────────────────────────────

function getOrCreateDatabaseSpreadsheet() {
  var files = DriveApp.getFilesByName(DB_SPREADSHEET_NAME);
  while (files.hasNext()) {
    var file = files.next();
    if (!file.isTrashed()) {
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (eShare) {}
      return SpreadsheetApp.openById(file.getId());
    }
  }

  // Buat baru jika belum ada
  var newSheet = SpreadsheetApp.create(DB_SPREADSHEET_NAME);
  try {
    var fileObj = DriveApp.getFileById(newSheet.getId());
    fileObj.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  } catch (eShare2) {}
  return newSheet;
}

function getOrCreateSheetTab(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    // Inisialisasi Header: ID, Ringkasan, RawData, UpdatedAt
    sheet.appendRow(["ID", "NOMOR / NAMA", "STATUS / DETAIL", "PETUGAS / USER", "RAW_DATA", "UPDATED_AT"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 6).setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");
  }
  return sheet;
}

function upsertItemToSheet(ss, tabName, item) {
  var sheet = getOrCreateSheetTab(ss, tabName);
  var id = String(item.id || item.username || "");
  if (!id) return;

  var lastRow = sheet.getLastRow();
  var rowIndexToUpdate = -1;

  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) {
        rowIndexToUpdate = i + 2;
        break;
      }
    }
  }

  var col2 = item.nomor || item.namaKapal || item.name || item.tujuan || item.grade || item.kepalaCabang || "";
  var col3 = item.status || item.approvalStatus || item.perihal || item.rate || item.uangHarian || item.role || "";
  var col4 = item.petugas || item.penerima || item.username || item.pemohon || "";
  var rawJson = JSON.stringify(item);
  var updatedAt = new Date().toISOString();

  var rowValues = [id, col2, col3, col4, rawJson, updatedAt];

  if (rowIndexToUpdate > 0) {
    sheet.getRange(rowIndexToUpdate, 1, 1, 6).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function deleteItemFromSheet(ss, tabName, id) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var idStr = String(id);
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === idStr) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

function syncTableBatch(ss, tabName, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  var sheet = ss.getSheetByName(tabName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(tabName);
  sheet.appendRow(["ID", "NOMOR / NAMA", "STATUS / DETAIL", "PETUGAS / USER", "RAW_DATA", "UPDATED_AT"]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 6).setBackground("#1e3a8a").setFontColor("#ffffff").setFontWeight("bold");

  var rowsToAdd = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item) continue;
    var id = String(item.id || item.username || ("item_" + i));
    var col2 = item.nomor || item.namaKapal || item.name || item.tujuan || item.grade || item.kepalaCabang || "";
    var col3 = item.status || item.approvalStatus || item.perihal || item.rate || item.uangHarian || item.role || "";
    var col4 = item.petugas || item.penerima || item.username || item.pemohon || "";
    var rawJson = JSON.stringify(item);
    var updatedAt = new Date().toISOString();
    rowsToAdd.push([id, col2, col3, col4, rawJson, updatedAt]);
  }

  if (rowsToAdd.length > 0) {
    sheet.getRange(2, 1, rowsToAdd.length, 6).setValues(rowsToAdd);
  }
}

function readTableRows(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Ambil kolom RAW_DATA (kolom ke-5)
  var rawDataCol = sheet.getRange(2, 5, lastRow - 1, 1).getValues();
  var result = [];

  for (var i = 0; i < rawDataCol.length; i++) {
    var str = rawDataCol[i][0];
    if (str) {
      try {
        result.push(JSON.parse(str));
      } catch (e) {
        // Fallback jika bukan JSON murni
      }
    }
  }

  return result;
}

function readAllTablesFromSpreadsheet(ss) {
  var tables = ['surat_tugas', 'kwitansi_honor', 'laporan_survei', 'tariffs', 'grade_tariffs', 'admin_settings', 'master_kapal', 'users', 'visit_survei'];
  var result = {};

  for (var i = 0; i < tables.length; i++) {
    var tbl = tables[i];
    var rows = readTableRows(ss, tbl);
    if (tbl === 'admin_settings') {
      result[tbl] = rows.length > 0 ? rows[0] : null;
    } else {
      result[tbl] = rows;
    }
  }

  return result;
}

function toCamelCase(str) {
  return str.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

// ─── GOOGLE DRIVE ATTACHMENT HELPER FUNCTIONS ────────────────────────────────

function handleUploadFileToDrive(payload) {
  var rootFolderName = payload.rootFolder || "BKI_DOKUMEN_SURAT";
  var year = payload.year || new Date().getFullYear().toString();
  var month = payload.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "MM-MMMM");
  var subFolder = payload.subFolder || "UMUM";
  var category = payload.category || "Dokumen_Lampiran";

  var fileName = payload.fileName || ("file_" + Date.now());
  var mimeType = payload.mimeType || "application/octet-stream";
  var base64Data = payload.base64Data || "";

  if (!base64Data) {
    return createJsonResponse({ success: false, message: "Data file (base64) tidak ditemukan atau kosong." }, 400);
  }

  if (base64Data.indexOf(",") > -1) {
    var parts = base64Data.split(",");
    base64Data = parts[1];
    if (parts[0].indexOf(":") > -1 && parts[0].indexOf(";") > -1) {
      mimeType = parts[0].split(":")[1].split(";")[0] || mimeType;
    }
  }

  var decodedBytes = Utilities.base64Decode(base64Data);
  var decodedBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);

  var targetFolder = getOrCreateFolderPath([rootFolderName, year, month, subFolder, category]);
  var createdFile = targetFolder.createFile(decodedBlob);

  try {
    createdFile.setDescription("Diunggah via Sistem Surat Tugas BKI Pontianak pada " + new Date().toLocaleString());
  } catch (eDesc) {}

  try {
    createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (errSharing) {}

  var fileId = createdFile.getId();
  var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view?usp=sharing";
  var previewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
  var directUrl = "https://lh3.googleusercontent.com/d/" + fileId;
  var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
  var thumbnailUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=s800";
  var folderUrl = targetFolder.getUrl();

  return createJsonResponse({
    success: true,
    fileId: fileId,
    fileName: createdFile.getName(),
    url: viewUrl,
    viewUrl: viewUrl,
    previewUrl: previewUrl,
    directUrl: directUrl,
    downloadUrl: downloadUrl,
    thumbnailUrl: thumbnailUrl,
    folderUrl: folderUrl,
    folderName: targetFolder.getName(),
    size: createdFile.getSize(),
    mimeType: createdFile.getMimeType(),
    storageProvider: "gdrive",
    uploadedAt: new Date().toISOString()
  });
}

function handleDeleteFileFromDrive(payload) {
  var rawId = payload.fileId || payload.fileUrl || "";
  if (!rawId) {
    return createJsonResponse({ success: false, message: "fileId atau URL tidak ditemukan" }, 400);
  }

  var fileId = rawId;
  var match = rawId.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/) ||
              rawId.match(/\/d\/([a-zA-Z0-9_-]{20,})/) ||
              rawId.match(/id=([a-zA-Z0-9_-]{20,})/);
  if (match && match[1]) {
    fileId = match[1];
  }

  try {
    var file = DriveApp.getFileById(fileId);
    var fileName = file.getName();
    file.setTrashed(true);
    return createJsonResponse({
      success: true,
      message: "File '" + fileName + "' berhasil dipindahkan ke Sampah Google Drive",
      fileId: fileId,
      fileName: fileName
    });
  } catch (delErr) {
    return createJsonResponse({
      success: false,
      message: "Gagal menghapus file: " + delErr.toString()
    }, 500);
  }
}

function getOrCreateFolderPath(folderNames) {
  var currentFolder = DriveApp.getRootFolder();
  for (var i = 0; i < folderNames.length; i++) {
    var name = String(folderNames[i]).trim().replace(/[/\\?%*:|"<>]/g, "_");
    if (!name) continue;
    var subFolders = currentFolder.getFoldersByName(name);
    if (subFolders.hasNext()) {
      currentFolder = subFolders.next();
    } else {
      currentFolder = currentFolder.createFolder(name);
    }
  }
  return currentFolder;
}

function getDriveQuotaInfo() {
  try {
    var storageUsed = DriveApp.getStorageUsed();
    var storageLimit = DriveApp.getStorageLimit();
    return {
      usedBytes: storageUsed,
      limitBytes: storageLimit,
      usedMB: Math.round(storageUsed / (1024 * 1024)),
      limitMB: Math.round(storageLimit / (1024 * 1024))
    };
  } catch (e) {
    return null;
  }
}

function createJsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
