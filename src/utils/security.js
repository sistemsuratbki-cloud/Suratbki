/**
 * Security Module — Sistem Surat Tugas BKI Pontianak
 * 
 * Provides: SHA-256 password hashing, XSS sanitization,
 * password strength validation, and brute-force rate limiting.
 */

// ============================================================
// 1. PASSWORD HASHING (SHA-256 + Salt)
// ============================================================

/**
 * Generate a random hex salt string.
 */
function generateSalt(length = 16) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a string with SHA-256 using the Web Crypto API.
 * Returns a hex-encoded hash.
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password with a random salt.
 * Returns a string in the format: "salt:hash"
 */
export async function hashPassword(password) {
  const salt = generateSalt();
  const hash = await sha256(salt + password);
  return `${salt}:${hash}`;
}

/**
 * Verify an input password against a stored "salt:hash" string.
 * Also handles legacy plaintext passwords for migration.
 */
export async function verifyPassword(inputPassword, storedHash) {
  // Handle legacy plaintext passwords (no colon = not hashed yet)
  if (!storedHash || !storedHash.includes(':')) {
    return inputPassword === storedHash;
  }

  const [salt, hash] = storedHash.split(':');
  const inputHash = await sha256(salt + inputPassword);
  return inputHash === hash;
}

/**
 * Check if a stored password value is already hashed (contains salt:hash format).
 */
export function isPasswordHashed(storedValue) {
  if (!storedValue || typeof storedValue !== 'string') return false;
  // Hashed format: 32 hex chars (salt) + ":" + 64 hex chars (SHA-256 hash) = 97 chars
  return /^[a-f0-9]{32}:[a-f0-9]{64}$/.test(storedValue);
}


export function unescapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

/**
 * Clean dangerous HTML tags and script injections to prevent XSS injection.
 * Use this on user text inputs before saving to state/localStorage.
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return unescapeHtml(str)
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove script tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe/embed/object tags
    .replace(/<(iframe|object|embed|svg|link|style)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '')
    // Remove inline event handlers (onerror=, onload=, onclick=, etc)
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Remove javascript:/vbscript:/data: protocols in attributes
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html):/gi, '')
    // Strip any remaining HTML tags
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Sanitize all string values in an object (recursively for nested objects/arrays).
 * Non-string values and password fields are left untouched.
 */
export function sanitizeFormData(formObj) {
  if (!formObj || typeof formObj !== 'object') return formObj;

  if (Array.isArray(formObj)) {
    return formObj.map((item) => sanitizeFormData(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(formObj)) {
    // Don't sanitize password fields — they need exact characters
    if (key.toLowerCase().includes('password') || key === 'pass') {
      sanitized[key] = value;
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
    }
  }
  return sanitized;
}

// ============================================================
// 2. FILE UPLOAD SECURITY VALIDATION
// ============================================================

export const ALLOWED_FILE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

/**
 * Validates uploaded file against size and permitted file types.
 * Prevents executable, script, or unauthorized file uploads.
 */
export function validateFileUpload(file, maxSize = 3 * 1024 * 1024) {
  if (!file) return { isValid: false, message: 'Tidak ada file yang dipilih.' };

  if (file.size > maxSize) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const maxMb = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      message: `Ukuran file "${file.name}" (${sizeMb} MB) melebihi batas maksimum ${maxMb} MB.`
    };
  }

  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      message: `Ekstensi file .${ext} tidak diizinkan! Hanya diperbolehkan berkas PDF, JPG, PNG, atau WEBP.`
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      message: `Tipe file tidak valid (${file.type}). Pastikan berkas berupa dokumen PDF atau foto asli.`
    };
  }

  return { isValid: true };
}


// ============================================================
// 3. PASSWORD STRENGTH VALIDATION
// ============================================================

/**
 * Validate password strength.
 * Requirements:
 *   - Minimum 6 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 number
 * 
 * Returns: { isValid, score, label, errors[] }
 *   score: 0 (very weak) to 4 (strong)
 *   label: 'Sangat Lemah' | 'Lemah' | 'Sedang' | 'Kuat'
 */
export function validatePasswordStrength(password) {
  const errors = [];
  let score = 0;

  if (!password || password.length < 6) {
    errors.push('Minimal 6 karakter');
  } else {
    score += 1;
  }

  if (password && password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['#dc2626', '#ef4444', '#f59e0b', '#10b981', '#059669'];

  return {
    isValid: errors.length === 0,
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    color: colors[Math.min(score, 4)],
    errors
  };
}


// ============================================================
// 4. LOGIN RATE LIMITER (Brute-Force Protection)
// ============================================================

const RATE_LIMIT_KEY = 'st_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Get the current rate limit state from localStorage.
 */
function getRateLimitState() {
  try {
    const saved = localStorage.getItem(RATE_LIMIT_KEY);
    if (!saved) return { attempts: 0, lockedUntil: null };
    return JSON.parse(saved);
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

/**
 * Save rate limit state to localStorage.
 */
function setRateLimitState(state) {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
}

/**
 * Check if login is currently locked out due to too many failed attempts.
 * Returns: { isLocked, remainingSeconds, attempts }
 */
export function checkLoginLock() {
  const state = getRateLimitState();

  if (state.lockedUntil) {
    const now = Date.now();
    if (now < state.lockedUntil) {
      const remainingMs = state.lockedUntil - now;
      return {
        isLocked: true,
        remainingSeconds: Math.ceil(remainingMs / 1000),
        attempts: state.attempts
      };
    } else {
      // Lockout expired — reset
      setRateLimitState({ attempts: 0, lockedUntil: null });
      return { isLocked: false, remainingSeconds: 0, attempts: 0 };
    }
  }

  return { isLocked: false, remainingSeconds: 0, attempts: state.attempts };
}

/**
 * Record a failed login attempt.
 * If MAX_ATTEMPTS reached, activate lockout.
 * Returns the updated lock state.
 */
export function recordFailedLogin() {
  const state = getRateLimitState();
  const newAttempts = state.attempts + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    setRateLimitState({ attempts: newAttempts, lockedUntil });
    return {
      isLocked: true,
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      attempts: newAttempts
    };
  }

  setRateLimitState({ attempts: newAttempts, lockedUntil: null });
  return { isLocked: false, remainingSeconds: 0, attempts: newAttempts };
}

/**
 * Reset the login rate limiter (called on successful login).
 */
export function resetLoginAttempts() {
  localStorage.removeItem(RATE_LIMIT_KEY);
}


// ============================================================
// 5. SESSION MANAGEMENT
// ============================================================

const SESSION_KEY = 'st_session_ts';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Create a new session timestamp.
 */
export function createSession() {
  localStorage.setItem(SESSION_KEY, String(Date.now()));
}

/**
 * Check if the current session is still valid (within 8 hours).
 */
export function isSessionValid() {
  const ts = localStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  return (Date.now() - Number(ts)) < SESSION_DURATION_MS;
}

/**
 * Destroy the current session.
 */
export function destroySession() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Get remaining session time in minutes.
 */
export function getSessionRemainingMinutes() {
  const ts = localStorage.getItem(SESSION_KEY);
  if (!ts) return 0;
  const elapsed = Date.now() - Number(ts);
  const remaining = SESSION_DURATION_MS - elapsed;
  return Math.max(0, Math.ceil(remaining / 60000));
}
