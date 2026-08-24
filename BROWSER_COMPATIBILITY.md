# Browser & Mobile Compatibility

## Fixed Issues

### ✅ WebSocket Error - Firefox & iOS Safari
**Error 1:** `WebSocket not available: The operation is insecure.`
**Error 2:** `Error: WebSocket not available: this.transport is not a constructor`

**Root Cause:**
- Supabase Realtime menggunakan WebSocket (WSS) untuk live updates
- CSP (Content Security Policy) di HTML blocking WebSocket connections
- Invalid `transport` config di Supabase client options
- Browser compatibility issues dengan Supabase realtime-js

**Solutions Applied:**

1. **Removed CSP from index.html:**
   - CSP headers sekarang dihandle oleh Vercel (production)
   - Development mode tanpa CSP restrictions

2. **Simplified Supabase Client (`src/lib/supabase.js`):**
   ```js
   - Removed invalid `transport` config
   - Added try-catch error handling
   - Let Supabase auto-detect WebSocket availability
   - Graceful fallback jika client init failed
   ```

3. **Vercel CSP Headers (`vercel.json`):**
   ```
   Content-Security-Policy:
   - connect-src: https://*.supabase.co wss://*.supabase.co
   - script-src: 'unsafe-eval' (required for Vite)
   - Strict-Transport-Security: force HTTPS
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

Aplikasi sekarang **tidak bergantung pada WebSocket**:
- ✅ **All core features work**: CRUD operations, export, print, upload
- ✅ **Database sync via HTTPS**: Standard REST API calls ke Supabase
- ℹ️ **Realtime disabled**: Auto-refresh tidak aktif, perlu manual refresh
- ✅ **Error handling**: Graceful fallback jika Supabase client init failed

**Note:** Realtime features (live updates tanpa refresh) memang di-disable untuk compatibility dengan semua browser.

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
   [Supabase] Failed to create client: <error>
   [Supabase] Running in offline mode - realtime features disabled
   ```
3. **Network tab**: Verify Supabase API calls (should be HTTPS, **not WSS**)
4. **Application tab**: Check localStorage for `st_auth_user`

**Expected Behavior:**
- No WebSocket connections (wss://) in Network tab
- All API calls via HTTPS REST (https://*.supabase.co/rest/v1/)
- Console may show "[Supabase] Running in offline mode" - **this is normal**

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