/**
 * Browser strategy using Playwright for downloading
 * This strategy controls a real browser to handle JS-rendered content
 */

import { chromium } from 'playwright';
import path from 'path';
import { BaseStrategy } from './base.js';
import { writeBinaryAtomic, ensureDir } from '../utils/file.js';
import * as manhuagui from '../parsers/manhuagui.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Browser-based download strategy
 * Uses Playwright to render pages and extract images
 */
export class BrowserStrategy extends BaseStrategy {
  constructor(options = {}) {
    super(options);
    this.name = 'browser';
    this.browser = null;
    this.page = null;
    this.context = null;

    // Configuration
    this.headless = options.headless ?? config.get('browser.headless', true);
    this.timeout = options.timeout ?? config.get('browser.timeout', 30000);
    this.viewport = options.viewport ?? config.get('browser.viewport', { width: 390, height: 844 });
    this.userAgent = options.userAgent ?? config.get('browser.userAgent');

    // Chapter data
    this.chapterUrl = null;
    this.comic = null;
    this.chapter = null;
    this.imageData = null;
    this.pageUrls = [];
  }

  /**
   * Prepare the browser and load the chapter page
   * @param {Object} context - Download context
   */
  async prepare(context) {
    this.chapterUrl = context.url;
    this.comic = context.comic;
    this.chapter = context.chapter;

    const log = logger.child('Browser');
    log.info(`Preparing browser for ${this.chapterUrl}`);

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.headless,
    });

    // Create context with mobile viewport
    this.context = await this.browser.newContext({
      viewport: this.viewport,
      userAgent: this.userAgent,
    });

    // Create page
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.timeout);

    // Navigate to chapter page
    log.info('Loading chapter page...');
    await this.page.goto(this.chapterUrl, {
      waitUntil: 'networkidle',
    });

    // Wait for image data to be available
    await this.page.waitForFunction(() => {
      return typeof window.img_data !== 'undefined' || document.querySelector('.vg-r-data');
    }, { timeout: this.timeout });

    log.info('Page loaded successfully');
  }

  /**
   * Get chapter information from the loaded page
   * @returns {Promise<Object>}
   */
  async getChapterInfo() {
    const log = logger.child('Browser');

    // Extract image data from page
    const data = await this.page.evaluate(() => {
      // Get img_data variable
      const imgDataVar = window.img_data;
      if (!imgDataVar) return null;

      // Decode base64
      let decoded;
      try {
        decoded = JSON.parse(atob(imgDataVar));
      } catch (e) {
        return null;
      }

      // Get host and prefix from data attributes
      const vrData = document.querySelector('.vg-r-data');
      const host = vrData?.dataset?.host || '';
      const imgPre = vrData?.dataset?.img_pre || '';
      const total = parseInt(vrData?.dataset?.total || decoded.length, 10);

      // Get title
      const titleEl = document.querySelector('h1, h2');
      const title = titleEl?.textContent?.trim() || '';

      return {
        host,
        imgPre,
        total,
        title,
        images: decoded,
      };
    });

    if (!data) {
      throw new Error('Failed to extract image data from page');
    }

    this.imageData = data;

    // Build page URLs
    this.pageUrls = data.images.map(img => {
      const filename = img.img_webp || img.img;
      return `${data.host}${data.imgPre}${filename}`;
    });

    log.info(`Found ${data.total} pages`);

    return {
      totalPages: data.total,
      title: data.title,
    };
  }

  /**
   * Get all page URLs
   * @returns {Promise<string[]>}
   */
  async getPageUrls() {
    if (this.pageUrls.length === 0) {
      await this.getChapterInfo();
    }
    return this.pageUrls;
  }

  /**
   * Fetch a single page image
   * @param {number} pageIndex - 1-based page index
   * @param {string} [url] - Optional URL override
   * @returns {Promise<Buffer>}
   */
  async fetchPage(pageIndex, url = null) {
    const log = logger.child('Browser');
    const imageUrl = url || this.pageUrls[pageIndex - 1];

    if (!imageUrl) {
      throw new Error(`No URL for page ${pageIndex}`);
    }

    log.debug(`Fetching page ${pageIndex}: ${imageUrl}`);

    // Use page.evaluate to fetch with proper context (cookies, referer)
    const imageData = await this.page.evaluate(async (imgUrl) => {
      try {
        const response = await fetch(imgUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      } catch (error) {
        throw new Error(`Fetch failed: ${error.message}`);
      }
    }, imageUrl);

    return Buffer.from(imageData);
  }

  /**
   * Save page to disk
   * @param {number} pageIndex - 1-based page index
   * @param {Buffer} data - Image data
   * @param {string} outputDir - Output directory
   * @returns {Promise<string>}
   */
  async savePage(pageIndex, data, outputDir) {
    const log = logger.child('Browser');

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
   * Cleanup browser resources
   */
  async cleanup() {
    const log = logger.child('Browser');
    log.debug('Cleaning up browser...');

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    log.debug('Browser cleanup complete');
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

export default BrowserStrategy;
