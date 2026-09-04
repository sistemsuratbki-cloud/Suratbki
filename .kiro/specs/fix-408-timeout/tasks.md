---
feature: fix-408-timeout
type: bugfix
status: pending
created: 2024-01-01
updated: 2024-01-01
---

# Implementation Tasks: Fix 408 Request Timeout Error

## Overview

This task list breaks down the implementation of the fix for 408 Request Timeout errors on pkadminclass.com. The fix addresses case-sensitivity issues in the .htaccess configuration and implements defense-in-depth timeout prevention.

---

## Task 1: Backup Current Configuration

**Status**: pending

**Requirements Mapped**: N/A (safety measure)

**Description**: Create a backup of the current .htaccess file before making any changes to ensure quick rollback capability if issues occur.

**Implementation Notes**:
- Copy `.htaccess` to `.htaccess.backup-[timestamp]`
- Verify backup file is created successfully
- Document backup location

**Verification Steps**:
- [ ] Confirm backup file exists
- [ ] Verify backup contains identical content to original

---

## Task 2: Add PHP Timeout Configuration

**Status**: pending

**Requirements Mapped**: 
- 2.1 (Load pages successfully within reasonable timeframe)
- 2.3 (Process requests through index.php successfully)

**Description**: Add PHP execution timeout directives at the top of .htaccess to provide application-level timeout protection for long-running PHP processes.

**Implementation Notes**:
- Add `<IfModule mod_php.c>` block at the top of .htaccess
- Set `php_value max_execution_time 300` (5 minutes)
- Set `php_value max_input_time 300` (5 minutes)
- This provides Layer 3 protection (PHP execution timeout extension)

**Code Change**:
```apache
<IfModule mod_php.c>
  php_value max_execution_time 300
  php_value max_input_time 300
</IfModule>
```

**Verification Steps**:
- [ ] PHP timeout directives are present at top of file
- [ ] Syntax is valid (no 500 errors)
- [ ] `ini_get('max_execution_time')` returns 300 when called from index.php

---

## Task 3: Remove Incorrect LiteSpeed Block

**Status**: pending

**Requirements Mapped**: 
- 2.2 (LiteSpeed anti-timeout directives SHALL prevent timeouts)

**Description**: Remove the existing `<IfModule Litespeed>` block with incorrect casing that prevents the anti-timeout rules from executing.

**Implementation Notes**:
- Locate the block: `<IfModule Litespeed>` (lowercase 's')
- Remove the entire block including its contents:
  - `RewriteEngine On`
  - `RewriteRule .* - [E=noconntimeout:1,E=noabort:1]`
- This block is never executed due to case sensitivity
- The anti-timeout rules will be re-added in correct location (Task 4)

**Verification Steps**:
- [ ] No `<IfModule Litespeed>` block exists in file (lowercase 's')
- [ ] File syntax remains valid

---

## Task 4: Move Anti-Timeout Rules to Main Rewrite Block

**Status**: pending

**Requirements Mapped**: 
- 2.1 (Load pages successfully)
- 2.2 (Prevent connection timeouts)
- 2.3 (Process requests successfully)

**Description**: Move the LiteSpeed anti-timeout rules into the main `<IfModule mod_rewrite.c>` block as the FIRST rules immediately after `RewriteEngine On` and `RewriteBase /`.

**Implementation Notes**:
- This ensures the anti-timeout environment variables are set early
- Environment variables will propagate to all subsequent rewrite rules
- Single RewriteEngine context eliminates rule order uncertainty
- This provides Layer 1 protection (LiteSpeed connection timeout prevention)

**Code Change**:
After the `RewriteBase /` line, add:
```apache
# CRITICAL: Prevent LiteSpeed timeouts (MUST BE FIRST)
RewriteRule .* - [E=noconntimeout:1,E=noabort:1]
```

**Verification Steps**:
- [ ] Anti-timeout rule is the first RewriteRule in mod_rewrite.c block
- [ ] Rule appears before file existence checks
- [ ] Rule appears before API routing rules
- [ ] Rule appears before index.php routing rule
- [ ] Environment variables `noconntimeout` and `noabort` are set to 1

---

## Task 5: Add Secondary LiteSpeed Block with Correct Casing

**Status**: pending

**Requirements Mapped**: 
- 2.2 (LiteSpeed anti-timeout directives SHALL prevent timeouts)

**Description**: Add a secondary LiteSpeed-specific configuration block with correct module name casing as a defense-in-depth measure.

**Implementation Notes**:
- Add after the main `<IfModule mod_rewrite.c>` block closes
- Use correct casing: `<IfModule LiteSpeed>` (capital 'S')
- Include additional LiteSpeed optimization hints
- This provides Layer 4 protection (explicit LiteSpeed configuration)

**Code Change**:
```apache
# 4. LiteSpeed-Specific Configuration (Secondary Defense)
<IfModule LiteSpeed>
  <IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteRule .* - [E=noabort:1,E=noconntimeout:1,E=cache-control:max-age=0]
  </IfModule>
</IfModule>
```

**Verification Steps**:
- [ ] Module name uses correct casing: `LiteSpeed` (capital 'S')
- [ ] Block is placed after main mod_rewrite.c block
- [ ] Block contains nested mod_rewrite.c context
- [ ] Syntax is valid

---

## Task 6: Test Homepage Loads Successfully

**Status**: pending

**Requirements Mapped**: 
- 2.1 (Load pages successfully within reasonable timeframe)
- 1.1 (Defect: homepage returns 408 error - must be fixed)

**Description**: Verify that the homepage of pkadminclass.com loads successfully without 408 timeout errors.

**Implementation Notes**:
- This is a critical verification checkpoint
- Test immediately after .htaccess changes are saved
- If test fails, investigate server logs before proceeding

**Verification Steps**:
- [ ] Access `https://pkadminclass.com/` in browser
- [ ] Page loads successfully (200 OK status)
- [ ] Page renders within 5 seconds
- [ ] No 408 error appears in browser
- [ ] No timeout errors in Apache/LiteSpeed error logs
- [ ] Response includes expected content (not error page)

---

## Task 7: Test Static File Serving

**Status**: pending

**Requirements Mapped**: 
- 3.1 (Static files SHALL CONTINUE TO be served directly)

**Description**: Verify that static files (CSS, JS, images) are served directly without routing through index.php, ensuring existing functionality is preserved.

**Implementation Notes**:
- Tests regression prevention requirement
- Static files should bypass PHP routing
- This validates the file existence check: `RewriteCond %{REQUEST_FILENAME} -f`

**Verification Steps**:
- [ ] Access static HTML: `https://pkadminclass.com/dist/index.html`
- [ ] Access CSS file: `https://pkadminclass.com/dist/assets/style.css`
- [ ] Access JavaScript: `https://pkadminclass.com/dist/assets/app.js`
- [ ] Access image: `https://pkadminclass.com/dist/assets/logo.svg`
- [ ] All return 200 OK status
- [ ] Files are served directly (check Content-Type headers)
- [ ] No 408 timeout errors occur

---

## Task 8: Test API Routing

**Status**: pending

**Requirements Mapped**: 
- 3.2 (API requests SHALL CONTINUE TO route to api/.htaccess)

**Description**: Verify that API endpoint routing remains functional and requests to /api/ are handled correctly.

**Implementation Notes**:
- Tests regression prevention requirement
- API folder should have its routing preserved
- This validates the rule: `RewriteRule ^api/ - [L]`

**Verification Steps**:
- [ ] Access API endpoint: `https://pkadminclass.com/api/surat`
- [ ] API returns appropriate response (JSON or error)
- [ ] Status code is NOT 408 timeout
- [ ] API routing behavior is unchanged from before fix
- [ ] Authorization headers are forwarded (if applicable)

---

## Task 9: Test Security Headers Present

**Status**: pending

**Requirements Mapped**: 
- 3.3 (Security headers SHALL CONTINUE TO be included)
- 3.6 (Sensitive files SHALL CONTINUE TO be blocked)

**Description**: Verify that all security headers and protections remain active after the .htaccess changes.

**Implementation Notes**:
- Tests regression prevention requirements
- Security configuration should be unaffected by timeout fixes
- Check both header presence and file access blocking

**Verification Steps**:
- [ ] Access homepage and check response headers include:
  - [ ] `X-Content-Type-Options: nosniff`
  - [ ] `X-Frame-Options: SAMEORIGIN`
  - [ ] `X-XSS-Protection: 1; mode=block`
- [ ] Attempt to access `.env` file - should return 403 Forbidden
- [ ] Attempt to access `.git/` directory - should return 403 Forbidden
- [ ] Attempt to access `config.php` - should return 403 Forbidden (if blocked)

---

## Task 10: Test Cache Control Headers

**Status**: pending

**Requirements Mapped**: 
- 3.4 (Cache control headers SHALL CONTINUE TO be set)
- 3.5 (GZIP compression SHALL CONTINUE TO compress responses)

**Description**: Verify that cache control and compression headers are properly applied to static assets.

**Implementation Notes**:
- Tests regression prevention requirements
- Performance optimization should remain intact
- Check both cache headers and compression

**Verification Steps**:
- [ ] Access CSS file and check response headers include:
  - [ ] `Cache-Control: max-age=[expected value]`
  - [ ] `Content-Encoding: gzip` (if compression enabled)
- [ ] Access JavaScript file and verify compression
- [ ] Access HTML and verify text/html compression
- [ ] Access JSON endpoint and verify compression

---

## Task 11: Test Authorization Header Forwarding

**Status**: pending

**Requirements Mapped**: 
- 3.7 (Authorization headers SHALL CONTINUE TO be forwarded)

**Description**: Verify that HTTP authorization headers and custom API tokens are properly forwarded to the application.

**Implementation Notes**:
- Tests regression prevention requirement
- Critical for API authentication to work
- Validates rules: `RewriteRule .* - [E=HTTP_AUTHORIZATION:...]`

**Verification Steps**:
- [ ] Make request with `Authorization: Bearer [token]` header
- [ ] Verify header is accessible in PHP via `$_SERVER['HTTP_AUTHORIZATION']`
- [ ] Make request with `X-API-Token: [token]` header
- [ ] Verify header is accessible in PHP via `$_SERVER['HTTP_X_API_TOKEN']`
- [ ] Authentication/authorization logic works as expected

---

## Task 12: Monitor Stability for 24 Hours

**Status**: pending

**Requirements Mapped**: 
- 2.1 (Load pages successfully - sustained operation)
- 2.2 (Prevent connection timeouts - consistent operation)

**Description**: Monitor the website for 24 hours after deployment to ensure the fix is stable and no new issues are introduced.

**Implementation Notes**:
- Final validation of the solution
- Ensures fix works under various load conditions
- Allows detection of edge cases or intermittent issues

**Verification Steps**:
- [ ] No 408 timeout errors appear in server logs over 24 hours
- [ ] All page types (homepage, routes, API, static) remain accessible
- [ ] Response times remain acceptable (< 5 seconds for first load)
- [ ] No increase in other error types (500, 503, etc.)
- [ ] Server resource usage remains normal
- [ ] User reports confirm website is accessible

---

## Rollback Plan

If critical issues occur during implementation:

1. **Immediate**: Restore from backup created in Task 1
2. **Alternative**: Try application-level timeout headers in index.php
3. **Escalation**: Contact Hostinger support for server-level LiteSpeed configuration

**Rollback Command**:
```bash
cp .htaccess.backup-[timestamp] .htaccess
```

---

## Success Criteria

All tasks are considered complete when:

- ✅ All 12 tasks show status: completed
- ✅ Homepage loads without 408 errors (Task 6)
- ✅ All regression tests pass (Tasks 7-11)
- ✅ 24-hour monitoring shows stability (Task 12)
- ✅ Server logs contain no timeout errors
- ✅ User access is fully restored

---

## Notes

- Tasks 1-5 are implementation tasks (modify .htaccess)
- Tasks 6-12 are verification tasks (test the fix)
- Tasks should be completed in sequential order
- If any verification task fails, halt and diagnose before proceeding
- Each task maps to specific requirements from bugfix.md sections 1-3
- The fix implements defense-in-depth with 4 layers of timeout protection
