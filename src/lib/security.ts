/**
 * NFR-SC-07: Password Policy Validator
 * Min 12 ký tự, bao gồm: chữ hoa, chữ thường, số, ký tự đặc biệt
 */
export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0-5
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very_strong';
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Rule 1: Min length 12 (NFR-SC-07)
  if (password.length < 12) {
    errors.push('Mật khẩu phải có ít nhất 12 ký tự');
  } else {
    score++;
    if (password.length >= 16) score++; // Bonus for longer
  }

  // Rule 2: Uppercase letter (NFR-SC-07)
  if (!/[A-Z]/.test(password)) {
    errors.push('Phải có ít nhất 1 chữ cái IN HOA');
  } else score++;

  // Rule 3: Lowercase letter (NFR-SC-07)
  if (!/[a-z]/.test(password)) {
    errors.push('Phải có ít nhất 1 chữ cái thường');
  } else score++;

  // Rule 4: Number (NFR-SC-07)
  if (!/\d/.test(password)) {
    errors.push('Phải có ít nhất 1 chữ số (0-9)');
  } else score++;

  // Rule 5: Special character (NFR-SC-07)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
  } else score++;

  // Determine strength
  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score >= 5) strength = 'very_strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'fair';
  else strength = 'weak';

  return { valid: errors.length === 0, score, errors, strength };
}

/**
 * NFR-SC-07: Quick check for API validation
 */
export function isPasswordCompliant(password: string): boolean {
  return validatePassword(password).valid;
}

/**
 * NFR-SC-04: SQL Injection / XSS input sanitizer
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"`;]/g, '') // Remove SQL injection chars
    .trim();
}

/**
 * NFR-SC-05: Audit log helper - check if entry is within retention period (1 year)
 */
export function isWithinRetentionPeriod(date: Date): boolean {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return date >= oneYearAgo;
}

/**
 * NFR-SC-03: 2FA OTP generator (6 digits)
 * In production: Use TOTP (RFC 6238) or SMS via Twilio
 */
export function generate2FACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * NFR-PF-01: Response time tracker
 */
export function createResponseTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    isWithinSLA: () => Date.now() - start <= 200, // ≤200ms P95
  };
}
