/**
 * Download context for managing runtime state
 */

import path from 'path';
import config from '../utils/config.js';
import logger from '../utils/logger.js';
import * as manhuagui from '../parsers/manhuagui.js';

/**
 * Download context class
 * Holds all information needed for a download operation
 */
export class DownloadContext {
  /**
   * @param {Object} options
   * @param {string} options.url - Chapter or comic URL
   * @param {string} [options.mode='browser'] - Download mode
   * @param {string} [options.outputDir] - Output directory
   */
  constructor(options) {
    this.url = options.url;
    this.mode = options.mode || 'browser';
    this.outputDir = options.outputDir || config.getOutputDir();

    // Parsed URL info
    this.parsed = null;
    this.comic = null;
    this.chapter = null;
    this.isComicUrl = false;
    this.isChapterUrl = false;

    // Runtime state
    this.startTime = null;
    this.endTime = null;

    this.log = logger.child('Context');
  }

  /**
   * Initialize context by parsing URL
   * @returns {Promise<DownloadContext>}
   */
  async init() {
    this.log.debug(`Initializing context for: ${this.url}`);

    // Try to parse as chapter URL
    this.parsed = manhuagui.parseChapterUrl(this.url);
    if (this.parsed) {
      this.isChapterUrl = true;
      this.comic = `comic_${this.parsed.comicId}`;
      this.chapter = `chapter_${this.parsed.chapterId}`;
      this.log.debug(`Parsed as chapter URL: comic=${this.comic}, chapter=${this.chapter}`);
      return this;
    }

    // Try to parse as comic URL
    this.parsed = manhuagui.parseComicUrl(this.url);
    if (this.parsed) {
      this.isComicUrl = true;
      this.comic = `comic_${this.parsed.comicId}`;
      this.log.debug(`Parsed as comic URL: comic=${this.comic}`);
      return this;
    }

    throw new Error(`Unsupported URL format: ${this.url}`);
  }

  /**
   * Get output directory for this context
   * @returns {string}
   */
  getOutputDir() {
    if (this.chapter) {
      return path.join(this.outputDir, this.comic, this.chapter);
    }
    return path.join(this.outputDir, this.comic);
  }

  /**
   * Start timer
   */
  start() {
    this.startTime = Date.now();
  }

  /**
   * End timer
   */
  end() {
    this.endTime = Date.now();
  }

  /**
   * Get elapsed time in seconds
   * @returns {number}
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    const end = this.endTime || Date.now();
    return (end - this.startTime) / 1000;
  }

  /**
   * Convert to task object
   * @param {Object} state - Chapter state
   * @returns {Object}
   */
  toTask(state) {
    return {
      url: this.url,
      comic: this.comic,
      chapter: this.chapter,
      mode: this.mode,
      outputDir: this.getOutputDir(),
      state,
    };
  }

  /**
   * Get summary
   * @returns {Object}
   */
  toSummary() {
    return {
      url: this.url,
      comic: this.comic,
      chapter: this.chapter,
      mode: this.mode,
      outputDir: this.getOutputDir(),
      elapsed: this.getElapsedTime(),
    };
  }
}

export default DownloadContext;
