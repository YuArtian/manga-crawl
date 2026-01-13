/**
 * Direct HTTP strategy for downloading
 * This strategy directly fetches images via HTTP without a browser
 */

import path from 'path';
import { BaseStrategy } from './base.js';
import { writeBinaryAtomic, ensureDir } from '../utils/file.js';
import { retry, withTimeout } from '../utils/retry.js';
import * as manhuagui from '../parsers/manhuagui.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Direct HTTP download strategy
 * Parses page HTML and directly downloads images
 */
export class DirectStrategy extends BaseStrategy {
  constructor(options = {}) {
    super(options);
    this.name = 'direct';

    // Configuration
    this.timeout = options.timeout ?? config.get('direct.timeout', 15000);
    this.retries = options.retries ?? config.get('direct.retries', 3);
    this.retryDelay = options.retryDelay ?? config.get('direct.retryDelay', 1000);

    // Chapter data
    this.chapterUrl = null;
    this.comic = null;
    this.chapter = null;
    this.imageData = null;
    this.pageUrls = [];
    this.headers = {};
  }

  /**
   * Prepare by fetching and parsing the chapter page
   * @param {Object} context - Download context
   */
  async prepare(context) {
    this.chapterUrl = context.url;
    this.comic = context.comic;
    this.chapter = context.chapter;

    const log = logger.child('Direct');
    log.info(`Preparing direct download for ${this.chapterUrl}`);

    // Set up headers for image requests
    this.headers = manhuagui.getImageRequestHeaders(this.chapterUrl);

    // Fetch chapter page
    log.info('Fetching chapter page...');
    const response = await this.fetchWithRetry(this.chapterUrl, {
      headers: {
        'User-Agent': this.headers['User-Agent'],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch chapter page: HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extract image data from HTML
    this.imageData = manhuagui.extractImageDataFromHtml(html);

    if (!this.imageData) {
      throw new Error('Failed to extract image data from page');
    }

    // Build page URLs
    this.pageUrls = manhuagui.buildImageUrls(this.imageData, true);

    log.info(`Found ${this.imageData.total} pages`);
  }

  /**
   * Get chapter information
   * @returns {Promise<Object>}
   */
  async getChapterInfo() {
    if (!this.imageData) {
      throw new Error('Strategy not prepared. Call prepare() first.');
    }

    return {
      totalPages: this.imageData.total,
      title: '',
    };
  }

  /**
   * Get all page URLs
   * @returns {Promise<string[]>}
   */
  async getPageUrls() {
    return this.pageUrls;
  }

  /**
   * Fetch a single page image
   * @param {number} pageIndex - 1-based page index
   * @param {string} [url] - Optional URL override
   * @returns {Promise<Buffer>}
   */
  async fetchPage(pageIndex, url = null) {
    const log = logger.child('Direct');
    const imageUrl = url || this.pageUrls[pageIndex - 1];

    if (!imageUrl) {
      throw new Error(`No URL for page ${pageIndex}`);
    }

    log.debug(`Fetching page ${pageIndex}: ${imageUrl}`);

    const response = await this.fetchWithRetry(imageUrl, {
      headers: this.headers,
    });

    if (!response.ok) {
      const error = new Error(`Failed to fetch image: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Save page to disk
   * @param {number} pageIndex - 1-based page index
   * @param {Buffer} data - Image data
   * @param {string} outputDir - Output directory
   * @returns {Promise<string>}
   */
  async savePage(pageIndex, data, outputDir) {
    const log = logger.child('Direct');

    // Determine file extension from URL or default to jpg
    const url = this.pageUrls[pageIndex - 1] || '';
    let ext = '.jpg';
    if (url.includes('.webp')) ext = '.webp';
    else if (url.includes('.png')) ext = '.png';

    // Create filename with zero-padded index
    const filename = `${String(pageIndex).padStart(3, '0')}${ext}`;
    const filePath = path.join(outputDir, filename);

    // Ensure directory exists and write file
    await ensureDir(outputDir);
    await writeBinaryAtomic(filePath, data);

    log.debug(`Saved page ${pageIndex} to ${filePath}`);
    return filePath;
  }

  /**
   * Fetch with retry and timeout
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async fetchWithRetry(url, options = {}) {
    const log = logger.child('Direct');

    return retry(
      async (attempt) => {
        if (attempt > 0) {
          log.debug(`Retry attempt ${attempt} for ${url}`);
        }

        const fetchPromise = fetch(url, options);
        return withTimeout(fetchPromise, this.timeout, `Request timeout: ${url}`);
      },
      {
        retries: this.retries,
        delay: this.retryDelay,
        onRetry: (error, attempt) => {
          log.warn(`Retry ${attempt}/${this.retries} for ${url}: ${error.message}`);
        },
      }
    );
  }

  /**
   * Cleanup (no resources to clean for direct strategy)
   */
  async cleanup() {
    // No cleanup needed for direct HTTP strategy
  }

  /**
   * Check if URL is supported
   * @param {string} url
   * @returns {boolean}
   */
  static supports(url) {
    return manhuagui.isManhuaguiUrl(url);
  }
}

export default DirectStrategy;
