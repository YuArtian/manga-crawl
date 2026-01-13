/**
 * Resource manager for controlling concurrent resource usage
 */

import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Token-based resource manager
 * Controls concurrent access to limited resources (browsers, HTTP connections)
 */
class ResourceManager {
  constructor(options = {}) {
    // Browser resource pool
    this.maxBrowserInstances = options.maxBrowserInstances ?? config.get('browser.maxInstances', 2);
    this.browserTokens = this.maxBrowserInstances;
    this.browserWaitQueue = [];

    // HTTP connection pool
    this.maxHttpConcurrency = options.maxHttpConcurrency ?? config.get('direct.maxConcurrency', 8);
    this.httpTokens = this.maxHttpConcurrency;
    this.httpWaitQueue = [];

    this.log = logger.child('ResourceManager');
  }

  /**
   * Acquire a browser token
   * @returns {Promise<void>} Resolves when token is acquired
   */
  async acquireBrowserToken() {
    if (this.browserTokens > 0) {
      this.browserTokens--;
      this.log.debug(`Browser token acquired. Available: ${this.browserTokens}/${this.maxBrowserInstances}`);
      return;
    }

    // Wait for a token to become available
    this.log.debug('Waiting for browser token...');
    return new Promise(resolve => {
      this.browserWaitQueue.push(resolve);
    });
  }

  /**
   * Release a browser token
   */
  releaseBrowserToken() {
    if (this.browserWaitQueue.length > 0) {
      // Give token to next waiter
      const resolve = this.browserWaitQueue.shift();
      resolve();
      this.log.debug('Browser token passed to waiter');
    } else {
      this.browserTokens++;
      this.log.debug(`Browser token released. Available: ${this.browserTokens}/${this.maxBrowserInstances}`);
    }
  }

  /**
   * Acquire an HTTP token
   * @returns {Promise<void>} Resolves when token is acquired
   */
  async acquireHttpToken() {
    if (this.httpTokens > 0) {
      this.httpTokens--;
      return;
    }

    // Wait for a token to become available
    return new Promise(resolve => {
      this.httpWaitQueue.push(resolve);
    });
  }

  /**
   * Release an HTTP token
   */
  releaseHttpToken() {
    if (this.httpWaitQueue.length > 0) {
      const resolve = this.httpWaitQueue.shift();
      resolve();
    } else {
      this.httpTokens++;
    }
  }

  /**
   * Get current resource status
   * @returns {Object}
   */
  getStatus() {
    return {
      browser: {
        available: this.browserTokens,
        max: this.maxBrowserInstances,
        waiting: this.browserWaitQueue.length,
      },
      http: {
        available: this.httpTokens,
        max: this.maxHttpConcurrency,
        waiting: this.httpWaitQueue.length,
      },
    };
  }

  /**
   * Check if browser resources are available
   * @returns {boolean}
   */
  hasBrowserToken() {
    return this.browserTokens > 0;
  }

  /**
   * Check if HTTP resources are available
   * @returns {boolean}
   */
  hasHttpToken() {
    return this.httpTokens > 0;
  }

  /**
   * Reset all resources (for cleanup)
   */
  reset() {
    this.browserTokens = this.maxBrowserInstances;
    this.httpTokens = this.maxHttpConcurrency;

    // Resolve all waiting promises
    while (this.browserWaitQueue.length > 0) {
      const resolve = this.browserWaitQueue.shift();
      resolve();
    }
    while (this.httpWaitQueue.length > 0) {
      const resolve = this.httpWaitQueue.shift();
      resolve();
    }
  }
}

// Singleton instance
const resourceManager = new ResourceManager();

export { ResourceManager, resourceManager };
export default ResourceManager;
