# Design Document: Fix 408 Request Timeout Error

## Overview

This design addresses the 408 Request Timeout error occurring on all pages of pkadminclass.com hosted on LiteSpeed servers. The issue prevents users from accessing the website despite existing anti-timeout directives in .htaccess.

## Root Cause Analysis

### Primary Issue: Case-Sensitive Module Directive

The current `.htaccess` file contains:
```apache
<IfModule Litespeed>
  RewriteEngine On
  RewriteRule .* - [E=noconntimeout:1,E=noabort:1]
</IfModule>
```

**Problem**: Apache `<IfModule>` directives are **case-sensitive**. The correct module name for LiteSpeed is `LiteSpeed` (capital S), not `Litespeed`.

**Impact**: Because the module name is incorrect, the entire block is **never executed**. The LiteSpeed anti-timeout rules (`noconntimeout:1`, `noabort:1`) are never applied, leaving requests vulnerable to aggressive timeout policies.

### Secondary Issue: Separate RewriteEngine Context

The anti-timeout rules are in a separate `<IfModule>` block from the main `mod_rewrite.c` block. This creates two problems:

1. **Redundant RewriteEngine**: Two separate `RewriteEngine On` declarations in different contexts
2. **Rule Order Uncertainty**: The anti-timeout environment variables might not propagate correctly to subsequent rewrite rules
3. **Context Isolation**: Environment variables set in one block may not be visible in another depending on Apache's processing order

### Tertiary Issue: Missing PHP Timeout Configuration

The .htaccess focuses on connection-level timeouts but doesn't address PHP execution timeouts. If a request reaches PHP but takes too long to execute, PHP's `max_execution_time` could trigger timeouts.

## Solution Design

### Architecture: Defense-in-Depth Approach

Implement multiple layers of timeout prevention:

```
Layer 1: LiteSpeed Connection Timeout Prevention
         ↓
Layer 2: Apache Request Processing
         ↓
Layer 3: PHP Execution Timeout Extension
         ↓
Layer 4: Output Buffer Flushing
```

### Detailed Solution Components

#### 1. Fix Module Name Case Sensitivity

**Change**: Correct `<IfModule Litespeed>` to `<IfModule LiteSpeed>`

**Rationale**: Ensures the LiteSpeed-specific directives are actually executed by the server.

#### 2. Consolidate Timeout Prevention into Main Rewrite Block

**Change**: Move anti-timeout rules **inside** the main `<IfModule mod_rewrite.c>` block as the **first rules** after `RewriteEngine On`.

**Structure**:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # FIRST: Prevent LiteSpeed timeouts (must be early)
  RewriteRule .* - [E=noconntimeout:1,E=noabort:1]
  
  # THEN: Rest of routing logic...
</IfModule>
```

**Rationale**: 
- Single `RewriteEngine On` context
- Environment variables set early and available to all subsequent rules
- Clear execution order guarantee
- Follows Apache best practices for environment variable scope

#### 3. Add PHP Timeout Configuration

**Add**: PHP execution time directives at the top of .htaccess

```apache
<IfModule mod_php.c>
  php_value max_execution_time 300
  php_value max_input_time 300
</IfModule>
```

**Rationale**: Provides fallback protection if the request reaches PHP but takes time to process (e.g., database queries, API calls).

#### 4. Add LiteSpeed-Specific Performance Hints

**Add**: Additional LiteSpeed optimization headers

```apache
<IfModule LiteSpeed>
  # Prevent connection abort on slow clients
  RewriteRule .* - [E=noabort:1]
  
  # Allow longer connection times
  RewriteRule .* - [E=noconntimeout:1]
  
  # Optimize output buffering
  RewriteRule .* - [E=cache-control:max-age=0]
</IfModule>
```

**Rationale**: Provides explicit LiteSpeed configuration in the correct module context as a secondary defense layer.

## Implementation Plan

### Phase 1: Critical Fix (.htaccess Restructure)

**File**: `.htaccess` (root)

**Changes**:
1. Remove the separate `<IfModule Litespeed>` block entirely
2. Add PHP timeout configuration at the top of the file
3. Move anti-timeout rules as the **first RewriteRule** inside `<IfModule mod_rewrite.c>`
4. Add a secondary `<IfModule LiteSpeed>` block after mod_rewrite for explicit LiteSpeed configuration

**New Structure**:
```apache
# =========================================================================
# Hostinger LiteSpeed — BKI Pontianak
# ZERO REWRITE — Semua routing via index.php (PHP)
# =========================================================================

# 1. PHP Timeout Configuration
<IfModule mod_php.c>
  php_value max_execution_time 300
  php_value max_input_time 300
</IfModule>

# 2. PHP handles everything
DirectoryIndex index.php

# 3. Routing and Timeout Prevention
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # CRITICAL: Prevent LiteSpeed timeouts (MUST BE FIRST)
  RewriteRule .* - [E=noconntimeout:1,E=noabort:1]

  # Forward auth headers
  RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
  RewriteRule .* - [E=HTTP_X_API_TOKEN:%{HTTP:X-API-Token}]

  # Existing files → serve directly
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteRule ^ - [L]

  # API folder → let api/.htaccess handle
  RewriteRule ^api/ - [L]

  # Everything else → index.php
  RewriteRule ^ index.php [L]
</IfModule>

# 4. LiteSpeed-Specific Configuration (Secondary Defense)
<IfModule LiteSpeed>
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule .* - [E=noabort:1,E=noconntimeout:1,E=cache-control:max-age=0]
  </IfModule>
</IfModule>

# 5-7. [Rest of configuration remains unchanged]
```

### Phase 2: Verification Points

**Checkpoint 1**: After .htaccess update
- Test homepage access: `https://pkadminclass.com/`
- Expected: Page loads successfully within 5 seconds
- Verify: No 408 error in browser or server logs

**Checkpoint 2**: Test all page types
- Static file: `https://pkadminclass.com/dist/assets/logo.svg`
- API endpoint: `https://pkadminclass.com/api/surat`
- Routed page: `https://pkadminclass.com/surat/list`
- Expected: All load successfully without timeout

**Checkpoint 3**: Monitor server logs
- Check Apache error log for module loading confirmation
- Verify LiteSpeed environment variables are set
- Confirm no timeout errors in logs

### Phase 3: Rollback Plan

If the fix causes issues:

1. **Immediate Rollback**: Restore original .htaccess from version control
2. **Alternative Approach**: Try placing anti-timeout rules in index.php using `header()` function:
   ```php
   header('X-LiteSpeed-NoAbort: 1');
   header('X-LiteSpeed-NoConnTimeout: 1');
   ```
3. **Server-Level Fix**: Contact Hostinger support to adjust LiteSpeed timeout settings at server configuration level

## Testing Strategy

### Unit Tests: Individual Rule Validation

1. **Test LiteSpeed Module Loading**
   - Method: Add `RewriteRule .* - [E=test:loaded]` and check response headers
   - Expected: `test: loaded` appears in environment
   - Validates: Module name is recognized

2. **Test Environment Variable Propagation**
   - Method: Check if `noconntimeout` appears in PHP `$_SERVER['REDIRECT_noconntimeout']`
   - Expected: Value is `1`
   - Validates: Variables propagate to PHP

3. **Test PHP Timeout Settings**
   - Method: Call `ini_get('max_execution_time')` in index.php
   - Expected: Returns `300`
   - Validates: PHP configuration is applied

### Integration Tests: Full Request Flow

1. **Test Homepage Load**
   - URL: `https://pkadminclass.com/`
   - Expected: 200 OK, page renders
   - Duration: < 5 seconds

2. **Test Static Asset Load**
   - URL: `https://pkadminclass.com/dist/index.html`
   - Expected: 200 OK, HTML served directly
   - Validates: File serving bypass works

3. **Test API Endpoint**
   - URL: `https://pkadminclass.com/api/surat`
   - Expected: JSON response or appropriate error
   - Validates: API routing preserved

4. **Test Slow Request Handling**
   - Method: Create test endpoint that sleeps for 60 seconds
   - Expected: Request completes without timeout
   - Validates: Timeout prevention works

### Regression Tests: Preserved Functionality

For each acceptance criterion in `bugfix.md` section 3 (Unchanged Behavior):

1. **3.1 Static File Serving**: Test direct file access
2. **3.2 API Routing**: Test /api/ endpoint routing
3. **3.3 Security Headers**: Verify headers present in response
4. **3.4 Cache Control**: Check cache headers on assets
5. **3.5 GZIP Compression**: Verify `Content-Encoding: gzip` header
6. **3.6 Sensitive File Blocking**: Test access to `.env`, `.git/`
7. **3.7 Authorization Headers**: Verify headers forwarded to application

### Performance Tests

1. **Response Time Baseline**
   - Measure: Time to first byte (TTFB) for homepage
   - Target: < 1 second for cached, < 3 seconds for uncached
   - Validates: Fix doesn't degrade performance

2. **Load Test**
   - Method: 100 concurrent requests to homepage
   - Expected: All complete successfully
   - Validates: Timeout fix scales under load

## Success Criteria

The fix is considered successful when:

1. ✅ All pages on pkadminclass.com load without 408 errors
2. ✅ Homepage loads within 5 seconds on first request
3. ✅ Static files are served directly (not through PHP)
4. ✅ API endpoints remain functional
5. ✅ All security headers and protections remain active
6. ✅ Server logs show no timeout-related errors
7. ✅ Solution works consistently over 24-hour monitoring period

## Technical Notes

### Why Case Sensitivity Matters

Apache's `<IfModule>` directive performs exact string matching against loaded module names. LiteSpeed registers itself as `LiteSpeed` (with capital S). The comparison is case-sensitive, so `Litespeed` fails to match and the entire block is skipped.

This is similar to how `<IfModule mod_rewrite.c>` must be exact—`<IfModule Mod_Rewrite.c>` or `<IfModule mod_REWRITE.c>` would fail.

### Why Environment Variables in mod_rewrite

The `[E=name:value]` flag in RewriteRule sets environment variables that LiteSpeed reads to modify its behavior:

- `noconntimeout:1` → Disables connection timeout enforcement
- `noabort:1` → Prevents aborting connections on slow clients

These **must** be set via RewriteRule within an active mod_rewrite context. Setting them in a non-executing `<IfModule>` block has no effect.

### Alternative: Server-Level Configuration

If .htaccess fixes fail, the ultimate solution is server-level LiteSpeed configuration:

```
# In LiteSpeed Web Admin Console
Server → External App → PHP Handler → Timeout Settings
- Connection Timeout: 300
- Max Connections: 100
```

This requires hosting provider (Hostinger) intervention.

## Dependencies

- **Apache mod_rewrite**: Already enabled (verified by existing rewrite rules working)
- **LiteSpeed Web Server**: Already in use (Hostinger default)
- **PHP Module**: Already active (index.php routing works)

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| .htaccess syntax error breaks site | High | Low | Test in staging; keep backup; validate syntax |
| PHP timeout still insufficient | Medium | Low | Increase from 300 to 600 if needed |
| LiteSpeed ignores environment variables | High | Very Low | Escalate to Hostinger support |
| Performance degradation | Medium | Very Low | Monitor response times; rollback if > 10% slower |

## Future Enhancements

If timeout issues persist or recur:

1. **Application-Level Timeout Handling**: Add timeout headers in index.php
2. **Async Processing**: Move slow operations to background jobs
3. **CDN Integration**: Offload static assets to reduce server load
4. **Database Optimization**: Index queries to reduce execution time
5. **Caching Layer**: Implement Redis/Memcached for frequently accessed data

## References

- [Apache IfModule Directive Documentation](https://httpd.apache.org/docs/2.4/mod/core.html#ifmodule)
- [LiteSpeed RewriteRule Environment Variables](https://docs.litespeedtech.com/lsws/cp/cpanel/litespeed-env-vars/)
- [Apache mod_rewrite Guide](https://httpd.apache.org/docs/2.4/rewrite/)
- Current .htaccess file: `/htaccess` (root)
- Requirements: `.kiro/specs/fix-408-timeout/bugfix.md`
