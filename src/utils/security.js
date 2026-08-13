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


// ============================================================
// 2. XSS INPUT SANITIZATION
// ============================================================

/**
 * Escape dangerous HTML characters to prevent XSS injection.
 * Use this on all user text inputs before saving to state/localStorage.
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize all string values in a flat object.
 * Non-string values are left untouched.
 */
export function sanitizeFormData(formObj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(formObj)) {
    // Don't sanitize password fields — they need exact characters
    if (key.toLowerCase().includes('password') || key === 'pass') {
      sanitized[key] = value;
    } else {
      sanitized[key] = typeof value === 'string' ? sanitizeInput(value) : value;
    }
  }
  return sanitized;
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

  if (!/[A-Z]/.test(password)) {
    errors.push('Harus ada minimal 1 huruf besar (A-Z)');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Harus ada minimal 1 huruf kecil (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Harus ada minimal 1 angka (0-9)');
  } else {
    score += 1;
  }

  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['#dc2626', '#ef4444', '#f59e0b', '#10b981', '#059669'];

  return {
    isValid: errors.length === 0,
    score,
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
