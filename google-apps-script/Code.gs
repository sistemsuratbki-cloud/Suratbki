/**
 * Google Apps Script Web App Template (Versi Terupdate & Paling Stabil)
 * Sistem Surat Tugas BKI Pontianak — Integrasi Google Drive
 * 
 * =========================================================================
 * PANDUAN PENERAPAN (DEPLOY) CEPAT:
 * =========================================================================
 * 1. Buka https://script.google.com/
 * 2. Buat "New Project" (Proyek Baru) atau buka proyek yang sudah ada.
 * 3. Hapus SEMUA isi Code.gs lama, lalu tempelkan (PASTE) seluruh kode di bawah ini.
 * 4. Klik ikon Disket (Save / Simpan).
 * 5. Klik tombol biru "Deploy" (Terapkan) di kanan atas -> pilih "New deployment" (Penerapan baru).
 * 6. Pada jendela konfigurasi:
 *    - Select type: "Web app" (Aplikasi Web)
 *    - Description: "BKI Drive Service v2"
 *    - Execute as: "Me" (Saya / akun Google Anda)
 *    - Who has access: "Anyone" (Siapa saja)  <--- SANGAT PENTING!
 * 7. Klik "Deploy", lalu klik "Authorize access" (Izinkan Akses).
 *    (Jika muncul peringatan "Google hasn't verified this app", klik "Advanced" -> "Go to ... (unsafe)").
 * 8. Salin "Web app URL" (format: https://script.google.com/macros/s/AKfycb.../exec).
 * 9. Tempelkan URL tersebut ke menu Pengaturan di web Surat BKI Anda!
 * =========================================================================
 */

/**
 * Handle HTTP GET (Uji Koneksi Browser & JSONP)
 */
function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) || "";
  var action = (e && e.parameter && e.parameter.action) || "ping";
  
  var activeUser = "";
  try {
    activeUser = Session.getActiveUser().getEmail();
  } catch (err) {}
  if (!activeUser) {
    try {
      activeUser = Session.getEffectiveUser().getEmail();
    } catch (err) {}
  }
  
  var responseData = {
    success: true,
    message: "Google Drive API BKI Pontianak aktif dan siap digunakan!",
    action: action,
    userEmail: activeUser || "Akun Google Terhubung",
    quotaRemaining: getDriveQuotaInfo(),
    timestamp: new Date().toISOString()
  };

  if (callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(responseData) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle HTTP POST (Upload, Delete, Ping)
 */
function doPost(e) {
  try {
    var payload = {};

    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // Fallback jika dikirim dalam form URL-encoded
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || "ping";

    // 1. PING / TEST KONEKSI
    if (action === "ping") {
      var userEmail = "";
      try {
        userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
      } catch (err) {}

      return createJsonResponse({
        success: true,
        message: "Koneksi ke Google Drive BKI berhasil terhubung!",
        userEmail: userEmail || "Akun Google Terhubung",
        quota: getDriveQuotaInfo(),
        timestamp: new Date().toISOString()
      });
    }

    // 2. UPLOAD FILE KE GOOGLE DRIVE
    if (action === "uploadFile" || action === "upload") {
      var rootFolderName = payload.rootFolder || "BKI_DOKUMEN_SURAT";
      var year = payload.year || new Date().getFullYear().toString();
      var month = payload.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "MM-MMMM");
      var subFolder = payload.subFolder || "UMUM";
      var category = payload.category || "Dokumen_Lampiran";

      var fileName = payload.fileName || ("file_" + Date.now());
      var mimeType = payload.mimeType || "application/octet-stream";
      var base64Data = payload.base64Data || "";

      if (!base64Data) {
        return createJsonResponse({
          success: false,
          message: "Data file (base64) tidak ditemukan atau kosong."
        }, 400);
      }

      // Bersihkan prefix data URL jika ada (contoh: data:image/jpeg;base64,xxxx)
      if (base64Data.indexOf(",") > -1) {
        var parts = base64Data.split(",");
        base64Data = parts[1];
        // Coba deteksi mimeType dari prefix jika belum di-set
        if (parts[0].indexOf(":") > -1 && parts[0].indexOf(";") > -1) {
          mimeType = parts[0].split(":")[1].split(";")[0] || mimeType;
        }
      }

      // Decode base64 menjadi Blob
      var decodedBytes = Utilities.base64Decode(base64Data);
      var decodedBlob = Utilities.newBlob(decodedBytes, mimeType, fileName);

      // Cari atau buat folder berjenjang: Root -> Tahun -> Bulan -> SubFolder (No SP / Kapal) -> Kategori
      var targetFolder = getOrCreateFolderPath([rootFolderName, year, month, subFolder, category]);

      // Simpan file ke target folder
      var createdFile = targetFolder.createFile(decodedBlob);

      // Beri deskripsi metadata pada file
      try {
        createdFile.setDescription("Diunggah via Sistem Surat Tugas BKI Pontianak pada " + new Date().toLocaleString());
      } catch (eDesc) {}

      // Set izin sharing agar file dapat dibuka & dilihat
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errSharing) {
        // Pada akun Google Workspace enterprise tertentu, sharing publik mungkin dibatasi
        Logger.log("Sharing error (tolerated): " + errSharing);
      }

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

    // 3. HAPUS FILE DARI GOOGLE DRIVE
    if (action === "deleteFile" || action === "delete") {
      var rawId = payload.fileId || payload.fileUrl || "";
      if (!rawId) {
        return createJsonResponse({ success: false, message: "fileId atau URL tidak ditemukan" }, 400);
      }

      // Ekstrak file ID dari kemungkinan format URL
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
        file.setTrashed(true); // Pindahkan ke Trash (Sampah)
        return createJsonResponse({
          success: true,
          message: "File '" + fileName + "' berhasil dipindahkan ke Sampah Google Drive",
          fileId: fileId,
          fileName: fileName
        });
      } catch (delErr) {
        return createJsonResponse({
          success: false,
          message: "Gagal menghapus file (" + fileId + "): " + delErr.toString()
        }, 500);
      }
    }

    return createJsonResponse({
      success: false,
      message: "Aksi '" + action + "' tidak dikenali oleh Google Drive API."
    }, 400);

  } catch (error) {
    return createJsonResponse({
      success: false,
      message: "Terjadi kesalahan di server Google Apps Script: " + error.toString()
    }, 500);
  }
}

/**
 * Membuat folder berjenjang secara berurutan dan aman
 */
function getOrCreateFolderPath(folderNames) {
  var currentFolder = DriveApp.getRootFolder();

  for (var i = 0; i < folderNames.length; i++) {
    var name = String(folderNames[i]).trim();
    if (!name) continue;

    // Bersihkan karakter ilegal untuk nama folder di Google Drive
    name = name.replace(/[/\\?%*:|"<>]/g, "_");

    var subFolders = currentFolder.getFoldersByName(name);
    if (subFolders.hasNext()) {
      currentFolder = subFolders.next();
    } else {
      currentFolder = currentFolder.createFolder(name);
    }
  }

  return currentFolder;
}

/**
 * Mendapatkan estimasi kuota penyimpanan akun Google
 */
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

/**
 * Format JSON response output
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
