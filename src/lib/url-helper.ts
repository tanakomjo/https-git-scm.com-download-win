/**
 * Utilities for resolving public store URLs and mobile-safe link handling
 * Solves localhost / iframe issues on mobile Chrome and provides clipboard fallbacks.
 */

// Deployed public Cloud Run URL accessible from any mobile device, iOS, and Android Chrome
export const DEFAULT_PUBLIC_URL = "https://ais-dev-yipyl6o27wx7rhovnc3rz6-518758351720.asia-southeast1.run.app";

/**
 * Returns the best URL base to be opened on external phones / Chrome
 */
export function getStoreBaseUrl(configuredPublicUrl?: string): string {
  if (configuredPublicUrl && configuredPublicUrl.trim().startsWith("http")) {
    return configuredPublicUrl.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    // If running in browser and NOT localhost/127.0.0.1
    if (
      hostname &&
      !hostname.includes("localhost") &&
      hostname !== "127.0.0.1" &&
      !hostname.endsWith(".local")
    ) {
      return origin;
    }
  }

  return DEFAULT_PUBLIC_URL;
}

/**
 * Returns direct table customer ordering URL
 */
export function getTableOrderUrl(tableId: string, configuredPublicUrl?: string): string {
  const base = getStoreBaseUrl(configuredPublicUrl);
  return `${base}/?table=${encodeURIComponent(tableId)}`;
}

/**
 * Robust copy-to-clipboard for mobile Chrome and desktop browsers
 */
export async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Try modern Clipboard API first
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  // Fallback using temporary textarea element (works on older mobile Chrome/iOS)
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}
