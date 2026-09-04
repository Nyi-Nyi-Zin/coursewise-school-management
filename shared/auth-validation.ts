export const STRONG_PASSWORD_MESSAGE = "Use at least 8 characters with uppercase, lowercase, a number, and a symbol.";
export function isStrongPassword(value: string) { return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value); }
export function isEnglishName(value: string) { return /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(value.trim()); }
export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function isValidEmail(value: string) {
  const email = normalizeEmail(value); if (email.length > 254 || /\s/.test(email)) return false;
  const parts = email.split("@"); if (parts.length !== 2 || !parts[0] || !parts[1] || parts[0].length > 64) return false;
  if (parts[0].startsWith(".") || parts[0].endsWith(".") || parts[0].includes("..")) return false;
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(parts[0]) && /^(?=.{1,253}$)(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(parts[1]);
}
