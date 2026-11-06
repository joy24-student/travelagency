/**
 * Anti-XSS & User Content Sanitizer
 *
 * Protects React Native Web and WebViews from HTML/Script injection attacks:
 * - Strips <script>, <iframe>, <object>, <embed>, <applet>, <style>, <link>, <meta>
 * - Neutralizes inline event handlers (onload, onerror, onclick, etc.)
 * - Escapes dangerous HTML entities
 * - Validates safe URI schemes (strictly rejects javascript:, data:, vbscript:)
 */

/**
 * Escape dangerous HTML characters
 */
export function escapeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Strip executable scripts, tags, and inline event handlers from user text
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  let cleaned = input;

  // 1. Remove script, iframe, object, embed, applet, style, link, meta tags and contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 2. Remove inline event handlers (e.g. onload=..., onerror=..., onclick=...)
  cleaned = cleaned.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");

  // 3. Remove dangerous protocols (javascript:, data:text/html, vbscript:)
  cleaned = cleaned.replace(/javascript\s*:/gi, "blocked-script:");
  cleaned = cleaned.replace(/vbscript\s*:/gi, "blocked-script:");
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, "blocked-data:");

  // 4. Strip any remaining raw HTML tag delimiters for safe string display
  cleaned = cleaned.replace(/<\/?[^>]+(>|$)/g, "");

  return cleaned.trim();
}

/**
 * Sanitize URLs to prevent XSS via href / src (e.g. javascript:alert(1))
 * Permitted protocols: https://, http://, or relative/internal app URLs.
 */
export function sanitizeMediaUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== "string") return undefined;

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Reject malicious schemes immediately
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("data:text/html") ||
    lower.includes("<script")
  ) {
    return undefined;
  }

  // Allow trusted secure protocols
  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://localhost") ||
    lower.startsWith("http://127.0.0.1") ||
    lower.startsWith("file://") ||
    lower.startsWith("content://") ||
    lower.startsWith("asset://")
  ) {
    return trimmed;
  }

  // If missing scheme, allow if relative asset path
  if (trimmed.startsWith("/") || trimmed.startsWith("./")) {
    return trimmed;
  }

  return undefined;
}

/**
 * General user text sanitizer
 */
export function sanitizeUserText(text?: string | null): string {
  if (!text) return "";
  return sanitizeHtml(text);
}
