/**
 * Base strategy interface for download strategies
 * All concrete strategies must implement these methods
 */

/**
 * Abstract base class for download strategies
 */
export class BaseStrategy {
  /**
   * @param {Object} options
   * @param {Object} options.config - Configuration object
   * @param {Object} options.logger - Logger instance
   */
  constructor(options = {}) {
    this.config = options.config || {};
    this.logger = options.logger || console;
    this.name = 'base';
  }

  /**
   * Prepare the strategy for downloading
   * @param {Object} context - Download context
   * @param {string} context.url - Chapter URL
   * @param {string} context.comic - Comic name
   * @param {string} context.chapter - Chapter ID
   * @returns {Promise<void>}
   */
  async prepare(context) {
    throw new Error('Method prepare() must be implemented by subclass');
  }

  /**
   * Get chapter information (total pages, title, etc.)
   * @returns {Promise<Object>} Chapter info
   * @returns {number} returns.totalPages - Total number of pages
   * @returns {string} [returns.title] - Chapter title
   */
  async getChapterInfo() {
    throw new Error('Method getChapterInfo() must be implemented by subclass');
  }

  /**
   * Get all page image URLs for the chapter
   * @returns {Promise<string[]>} Array of image URLs
   */
  async getPageUrls() {
    throw new Error('Method getPageUrls() must be implemented by subclass');
  }

  /**
   * Fetch a single page image data
   * @param {number} pageIndex - Page index (1-based)
   * @param {string} [url] - Optional URL override
   * @returns {Promise<Buffer>} Image data as Buffer
   */
  async fetchPage(pageIndex, url = null) {
    throw new Error('Method fetchPage() must be implemented by subclass');
  }

  /**
   * Save page to disk
   * @param {number} pageIndex - Page index (1-based)
   * @param {Buffer} data - Image data
   * @param {string} outputDir - Output directory
   * @returns {Promise<string>} Saved file path
   */
  async savePage(pageIndex, data, outputDir) {
    throw new Error('Method savePage() must be implemented by subclass');
  }

  /**
   * Cleanup resources (close browser, connections, etc.)
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Default implementation does nothing
  }

  /**
   * Check if the strategy supports the given URL
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  static supports(url) {
    return false;
  }

  /**
   * Get strategy name
   * @returns {string}
   */
  getName() {
    return this.name;
  }
}

export default BaseStrategy;
