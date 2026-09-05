import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = join(__dirname, 'dist');

// Serve static files dari dist/ dengan cache headers
app.use(express.static(distPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // HTML tidak di-cache agar SPA routing selalu fresh
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// SPA fallback — semua route dikembalikan ke index.html
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('<h1>App sedang dipersiapkan...</h1>');
  }
});

createServer(app).listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
