# Browser & Mobile Compatibility

## Fixed Issues

### ✅ WebSocket Error - Firefox & iOS Safari
**Error:** `WebSocket not available: The operation is insecure.`

**Root Cause:**
- Supabase Realtime menggunakan WebSocket (WSS) untuk live updates
- CSP (Content Security Policy) terlalu ketat dan memblokir WSS connections
- Mixed content issues (HTTP/HTTPS)

**Solutions Applied:**

1. **Updated CSP Headers in `index.html`:**
   ```html
   connect-src 'self' https://*.supabase.co wss://*.supabase.co
   ```
   - Added `wss://` untuk secure WebSocket connections
   - Added `unsafe-eval` untuk Vite development

2. **Enhanced Supabase Client (`src/lib/supabase.js`):**
   ```js
   - Check WebSocket availability before enabling realtime
   - Graceful degradation jika WebSocket tidak tersedia
   - Auto-disable realtime features untuk browser yang tidak support
   ```

3. **Vercel Headers (`vercel.json`):**
   ```json
   - Strict-Transport-Security untuk force HTTPS
   - X-Content-Type-Options untuk security
   - Rewrites untuk SPA routing
   ```

4. **Mobile Optimization (`vite.config.js`):**
   ```js
   target: ['es2015', 'safari11', 'ios11']
   - Transpile untuk older iOS/Safari versions
   - esbuild minifier untuk compatibility
   ```

## Supported Browsers

### ✅ Desktop Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### ✅ Mobile Browsers
- iOS Safari 11+
- Chrome for Android 90+
- Samsung Internet 14+
- Firefox for Android 88+

### ⚠️ Limited Support
- Internet Explorer 11 (not supported)
- Opera Mini (realtime features disabled)
- UC Browser (may have issues with WebSocket)

## Feature Degradation

Jika WebSocket tidak tersedia (detected automatically):
- ✅ **Core features tetap berfungsi**: CRUD operations, export, print
- ❌ **Realtime sync disabled**: Perlu manual refresh untuk melihat update dari user lain
- ⚠️ **Console warning**: "WebSocket not available - Realtime features disabled"

## Testing Checklist

### Desktop Testing
- [ ] Chrome - Login, create surat tugas, export Excel
- [ ] Firefox - Login, view calendar, edit data
- [ ] Safari - Login, print document, view reports
- [ ] Edge - Login, upload file, delete record

### Mobile Testing (iPhone/Android)
- [ ] iOS Safari - Login, responsive layout, touch gestures
- [ ] Chrome Mobile - Login, scroll performance, modal interactions
- [ ] Firefox Mobile - Login, form inputs, date pickers
- [ ] Samsung Internet - Login, navigation, data loading

### Network Conditions
- [ ] 4G - Full functionality
- [ ] 3G - Slower but functional
- [ ] Offline - Show proper error messages

## Debug Mode

Untuk troubleshoot browser compatibility issues:

1. **Open Browser Console** (F12 atau Inspect)
2. **Check for errors**:
   ```
   [Supabase] WebSocket not available - Realtime features disabled
   ```
3. **Network tab**: Verify Supabase API calls (should be HTTPS)
4. **Application tab**: Check localStorage for `st_auth_user`

## Known Issues

### iOS Safari < 11
- WebSocket may not work properly
- **Workaround**: Update iOS to latest version

### Firefox Private Mode
- localStorage may be restricted
- **Workaround**: Use normal mode or allow localStorage in settings

### Mobile Data Saver Mode
- Images/files may not load
- **Workaround**: Disable data saver or use WiFi

## Performance Optimization

### Bundle Size
- Main: ~1.5MB (compressed: ~398KB gzip)
- Vendor: ~141KB (compressed: ~45KB gzip)
- Supabase: ~234KB (compressed: ~58KB gzip)

### Load Time Targets
- **4G**: < 2 seconds
- **3G**: < 5 seconds
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms

## Vercel Deployment

Environment variables yang **WAJIB** di Vercel:
```env
VITE_SUPABASE_URL=https://brqnkwvvasoqogoibejh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

**Auto-handled by Vercel:**
- ✅ HTTPS enforcement (Strict-Transport-Security)
- ✅ Gzip compression
- ✅ CDN caching
- ✅ Edge network routing

## Security Notes

### CSP (Content Security Policy)
Configured untuk balance antara security dan functionality:
- `script-src 'unsafe-eval'` - **Required** untuk Vite HMR development
- `wss://*.supabase.co` - **Required** untuk Realtime WebSocket
- `https://*.supabase.co` - **Required** untuk API calls

### HTTPS Only
- Production **WAJIB** menggunakan HTTPS
- WebSocket hanya bekerja di WSS (secure)
- Mixed content akan di-block oleh browser

## Contact

Jika menemukan compatibility issue:
1. Check browser version (Chrome DevTools → Console)
2. Check console errors (F12)
3. Screenshot error message
4. Test di browser lain untuk isolate issue