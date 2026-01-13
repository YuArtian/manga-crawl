/**
 * Parsers module exports
 */

export * as manhuagui from './manhuagui.js';

/**
 * Get parser for URL
 * @param {string} url - URL to get parser for
 * @returns {Object|null} Parser module or null
 */
export function getParserForUrl(url) {
  if (/manhuagui\.com/.test(url)) {
    return import('./manhuagui.js');
  }
  return null;
}
