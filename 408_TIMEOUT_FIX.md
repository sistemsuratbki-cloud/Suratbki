# 408 Request Timeout Fix - BKI Surat Tugas

## Problem
Website returns 408 Request Timeout error when loading, especially on LiteSpeed hosting.

## Root Cause
The application performs **dual sync** (Hostinger MySQL + Google Sheets) for 8 different data tables on initial load:
- Surat Tugas
- Kwitansi Honor
- Laporan Survei
- Tariffs
- Grade Tariffs
- Admin Settings
- Master Kapal
- Visit Survei

Each fetch has:
1. **Primary fetch** from Hostinger MySQL (can timeout)
2. **Fallback fetch** from Google Sheets (if primary fails)
3. **No timeout limits** - can wait indefinitely

When all 8 tables are fetched in parallel via `Promise.all`, the total time can exceed LiteSpeed's 408 timeout threshold (~20-30 seconds).

## Solution Implemented

### 1. Individual Request Timeout (5s per source)
Added timeout wrapper in `src/lib/cloudSync.js`:

```javascript
const withTimeout = (promise, timeoutMs = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};
```

Each Hostinger or Google Sheets fetch now has a **5-second timeout**.

### 2. Total Sync Timeout (15s)
Added overall timeout in `src/context/DataContext.jsx`:

```javascript
const fetchWithTimeout = Promise.race([
  Promise.all([/* 8 fetches */]),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Cloud sync timeout')), 15000)
  )
]);
```

The entire cloud sync operation will timeout after **15 seconds maximum**.

### 3. LocalStorage Fallback Cache
If cloud sync times out:
- Data is loaded from **localStorage cache** immediately
- User sees their last synced data instead of blank screen
- Cloud sync retries in background

```javascript
catch (e) {
  console.warn('Cloud sync timeout - loading from cache');
  // Load from localStorage
  const cachedSurat = localStorage.getItem('st_surat_tugas');
  // ... load other cached data
}
```

### 4. Initial State from Cache
Data loads **immediately** from localStorage on app startup (before cloud sync):

```javascript
const [suratTugas, setSuratTugas] = useState(() => {
  const saved = localStorage.getItem('st_surat_tugas');
  return saved ? JSON.parse(saved) : INITIAL_SURAT_TUGAS;
});
```

## Timeline

| Time | Action |
|------|--------|
| 0ms | App starts, data loads from localStorage (instant) |
| 0-5s | Hostinger MySQL fetch (5s timeout per table) |
| 5-10s | Google Sheets fallback (if Hostinger fails) |
| 15s | Total sync timeout - use cache if still pending |

## Benefits

1. **No more 408 errors** - Total sync capped at 15 seconds
2. **Instant app load** - Data shows immediately from cache
3. **Graceful degradation** - Works even if cloud sync fails
4. **Better UX** - User sees data while sync happens in background
5. **Reduced server load** - Faster timeouts prevent hanging connections

## Testing

To test the fix:

1. **Hard refresh browser**: `Ctrl + Shift + R`
2. **Clear cache** (optional): Test with no localStorage
3. **Slow network**: Throttle network in DevTools to simulate slow connection
4. **Monitor console**: Check for "Cloud sync timeout" message

## Files Modified

- `src/lib/cloudSync.js` - Added `withTimeout` wrapper for individual requests
- `src/context/DataContext.jsx` - Added 15s total timeout + localStorage fallback

## Rollback

If issues occur, revert to previous version:
```bash
git revert HEAD
```

## Future Optimization

Consider implementing:
- **Lazy loading** - Load only visible data first
- **Progressive enhancement** - Load critical data first, then secondary
- **IndexedDB** - Better client-side caching for large datasets
- **Server-side pagination** - Reduce data payload size

---

**Status**: ✅ Fixed
**Date**: 2026-09-05
**Impact**: High - Prevents website from loading
**Priority**: Critical
