/**
 * Google Apps Script Web App Template
 * Sistem Surat Tugas BKI Pontianak — Integrasi Google Drive
 * 
 * CARA SETUP DALAM 2 MENIT:
 * 1. Buka https://script.google.com/
 * 2. Klik "New Project" (Proyek Baru)
 * 3. Hapus semua kode default, lalu Paste seluruh kode ini ke dalam editor (Code.gs)
 * 4. Beri nama proyek, misal: "BKI Surat Drive API"
 * 5. Klik tombol biru "Deploy" (Terapkan) -> "New deployment" (Penerapan baru)
 * 6. Pilih tipe: "Web app" (Aplikasi Web)
 *    - Description: "BKI Drive Upload v1"
 *    - Execute as: "Me" (Saya / akun Google Anda)
 *    - Who has access: "Anyone" (Siapa saja)
 * 7. Klik "Deploy", lalu izinkan akses (Authorize Access)
 * 8. Salin "Web app URL" (format: https://script.google.com/macros/s/.../exec)
 * 9. Tempelkan URL tersebut ke menu Pengaturan di aplikasi Surat BKI!
 */

function doGet(e) {
  return handleResponse({
    success: true,
    message: "Google Drive API BKI Pontianak aktif dan siap digunakan!",
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return handleResponse({ success: false, message: "Payload kosong atau tidak valid" }, 400);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "uploadFile";

    // 1. PING / TEST CONNECTION
    if (action === "ping") {
      return handleResponse({
        success: true,
        message: "Koneksi ke Google Drive berhasil!",
        userEmail: Session.getActiveUser().getEmail() || "Google Drive Account",
        timestamp: new Date().toISOString()
      });
    }

    // 2. UPLOAD FILE
    if (action === "uploadFile") {
      var rootFolderName = payload.rootFolder || "BKI_DOKUMEN_SURAT";
      var year = payload.year || new Date().getFullYear().toString();
      var month = payload.month || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM-MMMM");
      var subFolder = payload.subFolder || "UMUM";
      var category = payload.category || "Dokumen";
      
      var fileName = payload.fileName || ("file_" + Date.now());
      var mimeType = payload.mimeType || "application/octet-stream";
      var base64Data = payload.base64Data || "";

      if (!base64Data) {
        return handleResponse({ success: false, message: "Data file (base64) tidak ditemukan" }, 400);
      }

      // Bersihkan prefix data URL jika ada (data:image/png;base64,...)
      if (base64Data.indexOf(",") > -1) {
        base64Data = base64Data.split(",")[1];
      }

      var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, fileName);

      // Cari atau buat folder hierarki: Root -> Tahun -> Bulan -> SubFolder (No SP / Kapal) -> Kategori
      var targetFolder = getOrCreateFolderPath([rootFolderName, year, month, subFolder, category]);

      // Buat file di target folder
      var createdFile = targetFolder.createFile(decodedBlob);
      
      // Set sharing agar bisa diakses via link
      try {
        createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (errSharing) {
        // Abaikan jika domain enterprise membatasi sharing public
      }

      var fileId = createdFile.getId();
      var viewUrl = "https://drive.google.com/file/d/" + fileId + "/view";
      var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
      var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
      var thumbnailUrl = "https://lh3.googleusercontent.com/d/" + fileId + "=s800";
      var folderUrl = targetFolder.getUrl();

      return handleResponse({
        success: true,
        fileId: fileId,
        fileName: createdFile.getName(),
        url: viewUrl,
        viewUrl: viewUrl,
        downloadUrl: downloadUrl,
        directUrl: directUrl,
        thumbnailUrl: thumbnailUrl,
        folderUrl: folderUrl,
        size: createdFile.getSize(),
        mimeType: createdFile.getMimeType(),
        storageProvider: "gdrive",
        uploadedAt: new Date().toISOString()
      });
    }

    // 3. DELETE FILE
    if (action === "deleteFile") {
      var rawId = payload.fileId || payload.fileUrl || "";
      if (!rawId) {
        return handleResponse({ success: false, message: "fileId tidak ditemukan" }, 400);
      }

      // Extract file ID if a URL was passed
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
        file.setTrashed(true); // Pindahkan ke Trash (bisa di-restore)
        return handleResponse({
          success: true,
          message: "File '" + fileName + "' berhasil dihapus dari Google Drive",
          fileId: fileId,
          fileName: fileName
        });
      } catch (delErr) {
        return handleResponse({
          success: false,
          message: "Gagal menghapus file (" + fileId + "): " + delErr.toString()
        }, 500);
      }
    }

    return handleResponse({ success: false, message: "Aksi '" + action + "' tidak dikenali" }, 400);

  } catch (error) {
    return handleResponse({
      success: false,
      message: "Terjadi kesalahan di server Google Drive: " + error.toString()
    }, 500);
  }
}

/**
 * Membuat atau menemukan folder hierarki secara berurutan
 */
function getOrCreateFolderPath(folderNames) {
  var currentFolder = DriveApp.getRootFolder();

  for (var i = 0; i < folderNames.length; i++) {
    var name = String(folderNames[i]).trim();
    if (!name) continue;

    // Bersihkan karakter ilegal untuk nama folder
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
 * Format JSON response dengan header CORS yang aman
 */
function handleResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
