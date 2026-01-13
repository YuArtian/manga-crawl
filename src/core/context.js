/**
 * Download context for managing runtime state
 */

import path from 'path';
import config from '../utils/config.js';
import logger from '../utils/logger.js';
import { getLibrary } from '../utils/library.js';
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
   * @param {string} [options.comicName] - Semantic comic name (from library)
   */
  constructor(options) {
    this.url = options.url;
    this.mode = options.mode || 'browser';
    this.outputDir = options.outputDir || config.getOutputDir();
    this.comicName = options.comicName || null; // Semantic name from library

    // Parsed URL info
    this.parsed = null;
    this.comicId = null;    // Website comic ID (e.g., "30252")
    this.chapterId = null;  // Website chapter ID (e.g., "405318")
    this.comic = null;      // Folder name (semantic or ID-based)
    this.chapter = null;    // Chapter folder name
    this.isComicUrl = false;
    this.isChapterUrl = false;

    // Library reference
    this.library = getLibrary();
    this.libraryManga = null; // Manga config from library

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
      this.comicId = this.parsed.comicId;
      this.chapterId = this.parsed.chapterId;
      
      // Try to find comic in library for semantic naming
      await this._resolveLibraryInfo();
      
      this.log.debug(`Parsed as chapter URL: comic=${this.comic}, chapter=${this.chapter}`);
      return this;
    }

    // Try to parse as comic URL
    this.parsed = manhuagui.parseComicUrl(this.url);
    if (this.parsed) {
      this.isComicUrl = true;
      this.comicId = this.parsed.comicId;
      
      // Try to find comic in library for semantic naming
      await this._resolveLibraryInfo();
      
      this.log.debug(`Parsed as comic URL: comic=${this.comic}`);
      return this;
    }

    throw new Error(`Unsupported URL format: ${this.url}`);
  }

  /**
   * Resolve library info for semantic naming
   * @private
   */
  async _resolveLibraryInfo() {
    // If manga name provided, use it
    if (this.comicName) {
      this.libraryManga = await this.library.getMangaByName(this.comicName);
    }
    
    // Otherwise try to find by ID
    if (!this.libraryManga && this.comicId) {
      this.libraryManga = await this.library.getMangaById(this.comicId);
    }

    // Set manga folder name (semantic or ID-based)
    if (this.libraryManga) {
      this.comic = this.libraryManga.name;
      this.comicName = this.libraryManga.name;
      
      // Set chapter folder name (semantic or ID-based)
      if (this.chapterId) {
        this.chapter = await this.library.getChapterFolderName(
          this.libraryManga.name,
          this.chapterId
        );
      }
    } else {
      // Fallback to ID-based naming
      this.comic = `manga_${this.comicId}`;
      if (this.chapterId) {
        this.chapter = `chapter_${this.chapterId}`;
      }
    }
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
