/**
 * Strategies module exports
 */

export { BaseStrategy } from './base.js';
export { BrowserStrategy } from './browser.js';
export { DirectStrategy } from './direct.js';

/**
 * Get strategy by name
 * @param {string} name - Strategy name ('browser' or 'direct')
 * @returns {typeof BaseStrategy}
 */
export function getStrategy(name) {
  switch (name.toLowerCase()) {
    case 'browser':
      return BrowserStrategy;
    case 'direct':
      return DirectStrategy;
    default:
      throw new Error(`Unknown strategy: ${name}`);
  }
}
