/**
 * Chapter state management for tracking download progress
 */

import path from 'path';
import { readJson, writeJsonAtomic, fileExists, ensureDir } from '../utils/file.js';

/**
 * Chapter status enum
 */
export const ChapterStatus = {
  NEW: 'new',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Chapter state class for tracking individual chapter download progress
 */
export class ChapterState {
  /**
   * @param {Object} options
   * @param {string} options.comic - Comic name/ID
   * @param {string} options.chapter - Chapter number/name
   * @param {string} options.url - Chapter URL
   * @param {string} options.stateDir - State directory path
   */
  constructor(options) {
    this.comic = options.comic;
    this.chapter = options.chapter;
    this.url = options.url;
    this.stateDir = options.stateDir;

    // State data
    this.status = ChapterStatus.NEW;
    this.mode = 'browser';
    this.totalPages = 0;
    this.completedPages = [];
    this.failedPages = [];
    this.retryCount = 0;
    this.lastError = null;
    this.createdAt = null;
    this.lastUpdate = null;

    // File path for this chapter's state
    this.filePath = path.join(
      this.stateDir,
      this.comic,
      `${this.chapter}.json`
    );
  }

  /**
   * Load state from file
   * @returns {Promise<ChapterState>}
   */
  async load() {
    const data = await readJson(this.filePath);

    if (data) {
      this.status = data.status || ChapterStatus.NEW;
      this.mode = data.mode || 'browser';
      this.totalPages = data.totalPages || 0;
      this.completedPages = data.completedPages || [];
      this.failedPages = data.failedPages || [];
      this.retryCount = data.retryCount || 0;
      this.lastError = data.lastError || null;
      this.createdAt = data.createdAt || null;
      this.lastUpdate = data.lastUpdate || null;
    }

    return this;
  }

  /**
   * Save state to file
   * @returns {Promise<void>}
   */
  async save() {
    this.lastUpdate = new Date().toISOString();

    if (!this.createdAt) {
      this.createdAt = this.lastUpdate;
    }

    const data = {
      comic: this.comic,
      chapter: this.chapter,
      url: this.url,
      status: this.status,
      mode: this.mode,
      totalPages: this.totalPages,
      completedPages: this.completedPages,
      failedPages: this.failedPages,
      retryCount: this.retryCount,
      lastError: this.lastError,
      createdAt: this.createdAt,
      lastUpdate: this.lastUpdate,
    };

    await writeJsonAtomic(this.filePath, data);
  }

  /**
   * Check if state file exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    return fileExists(this.filePath);
  }

  /**
   * Mark a page as completed
   * @param {number} pageIndex - Page index (1-based)
   * @returns {Promise<void>}
   */
  async markPageDone(pageIndex) {
    if (!this.completedPages.includes(pageIndex)) {
      this.completedPages.push(pageIndex);
      this.completedPages.sort((a, b) => a - b);

      // Remove from failed if it was there
      this.failedPages = this.failedPages.filter(p => p !== pageIndex);

      await this.save();
    }
  }

  /**
   * Mark a page as failed
   * @param {number} pageIndex - Page index (1-based)
   * @param {string} [error] - Error message
   * @returns {Promise<void>}
   */
  async markPageFailed(pageIndex, error = null) {
    if (!this.failedPages.includes(pageIndex)) {
      this.failedPages.push(pageIndex);
      this.failedPages.sort((a, b) => a - b);
    }
    if (error) {
      this.lastError = error;
    }
    await this.save();
  }

  /**
   * Check if a page is completed
   * @param {number} pageIndex - Page index (1-based)
   * @returns {boolean}
   */
  isPageDone(pageIndex) {
    return this.completedPages.includes(pageIndex);
  }

  /**
   * Check if chapter is fully completed
   * @returns {boolean}
   */
  isCompleted() {
    return this.status === ChapterStatus.COMPLETED ||
      (this.totalPages > 0 && this.completedPages.length >= this.totalPages);
  }

  /**
   * Get pending pages (not completed, not currently failed)
   * @returns {number[]}
   */
  getPendingPages() {
    if (this.totalPages === 0) return [];

    const pending = [];
    for (let i = 1; i <= this.totalPages; i++) {
      if (!this.completedPages.includes(i)) {
        pending.push(i);
      }
    }
    return pending;
  }

  /**
   * Get progress percentage
   * @returns {number}
   */
  getProgress() {
    if (this.totalPages === 0) return 0;
    return Math.round((this.completedPages.length / this.totalPages) * 100);
  }

  /**
   * Set status to running
   * @returns {Promise<void>}
   */
  async start() {
    this.status = ChapterStatus.RUNNING;
    await this.save();
  }

  /**
   * Set status to paused
   * @returns {Promise<void>}
   */
  async pause() {
    this.status = ChapterStatus.PAUSED;
    await this.save();
  }

  /**
   * Set status to completed
   * @returns {Promise<void>}
   */
  async complete() {
    this.status = ChapterStatus.COMPLETED;
    await this.save();
  }

  /**
   * Set status to failed
   * @param {string} [error] - Error message
   * @returns {Promise<void>}
   */
  async fail(error = null) {
    this.status = ChapterStatus.FAILED;
    if (error) {
      this.lastError = error;
    }
    this.retryCount++;
    await this.save();
  }

  /**
   * Reset chapter state (for re-download)
   * @returns {Promise<void>}
   */
  async reset() {
    this.status = ChapterStatus.NEW;
    this.completedPages = [];
    this.failedPages = [];
    this.retryCount = 0;
    this.lastError = null;
    await this.save();
  }

  /**
   * Get summary object
   * @returns {Object}
   */
  toSummary() {
    return {
      comic: this.comic,
      chapter: this.chapter,
      status: this.status,
      progress: `${this.completedPages.length}/${this.totalPages}`,
      percentage: this.getProgress(),
    };
  }
}

export default ChapterState;
