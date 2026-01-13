/**
 * Task state for managing comic-level download tasks
 */

import path from 'path';
import { readJson, writeJsonAtomic, fileExists, listFiles } from '../utils/file.js';
import { ChapterState, ChapterStatus } from './chapter-state.js';

/**
 * Task status enum
 */
export const TaskStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Task state class for managing comic-level tasks
 */
export class TaskState {
  /**
   * @param {Object} options
   * @param {string} options.comic - Comic name/ID
   * @param {string} options.url - Comic URL
   * @param {string} options.stateDir - State directory path
   * @param {string} [options.mode='browser'] - Download mode
   */
  constructor(options) {
    this.comic = options.comic;
    this.url = options.url;
    this.stateDir = options.stateDir;
    this.mode = options.mode || 'browser';

    // Task metadata
    this.status = TaskStatus.PENDING;
    this.totalChapters = 0;
    this.completedChapters = 0;
    this.chapters = []; // Array of chapter info objects
    this.createdAt = null;
    this.lastUpdate = null;

    // File path for task state
    this.filePath = path.join(this.stateDir, this.comic, '_task.json');

    // Chapter states cache
    this._chapterStates = new Map();
  }

  /**
   * Load task state from file
   * @returns {Promise<TaskState>}
   */
  async load() {
    const data = await readJson(this.filePath);

    if (data) {
      this.status = data.status || TaskStatus.PENDING;
      this.mode = data.mode || 'browser';
      this.totalChapters = data.totalChapters || 0;
      this.completedChapters = data.completedChapters || 0;
      this.chapters = data.chapters || [];
      this.createdAt = data.createdAt || null;
      this.lastUpdate = data.lastUpdate || null;
    }

    return this;
  }

  /**
   * Save task state to file
   * @returns {Promise<void>}
   */
  async save() {
    this.lastUpdate = new Date().toISOString();

    if (!this.createdAt) {
      this.createdAt = this.lastUpdate;
    }

    const data = {
      comic: this.comic,
      url: this.url,
      status: this.status,
      mode: this.mode,
      totalChapters: this.totalChapters,
      completedChapters: this.completedChapters,
      chapters: this.chapters,
      createdAt: this.createdAt,
      lastUpdate: this.lastUpdate,
    };

    await writeJsonAtomic(this.filePath, data);
  }

  /**
   * Check if task state file exists
   * @returns {Promise<boolean>}
   */
  async exists() {
    return fileExists(this.filePath);
  }

  /**
   * Set chapters for this task
   * @param {Array<{chapter: string, url: string, title?: string}>} chapters
   * @returns {Promise<void>}
   */
  async setChapters(chapters) {
    this.chapters = chapters;
    this.totalChapters = chapters.length;
    await this.save();
  }

  /**
   * Get or create chapter state
   * @param {string} chapter - Chapter ID
   * @param {string} url - Chapter URL
   * @returns {Promise<ChapterState>}
   */
  async getChapterState(chapter, url) {
    const key = `${this.comic}:${chapter}`;

    if (this._chapterStates.has(key)) {
      return this._chapterStates.get(key);
    }

    const state = new ChapterState({
      comic: this.comic,
      chapter,
      url,
      stateDir: this.stateDir,
    });

    await state.load();
    state.mode = this.mode; // Inherit mode from task

    this._chapterStates.set(key, state);
    return state;
  }

  /**
   * Update completed chapters count
   * @returns {Promise<void>}
   */
  async updateProgress() {
    let completed = 0;

    for (const chapterInfo of this.chapters) {
      const state = await this.getChapterState(chapterInfo.chapter, chapterInfo.url);
      if (state.isCompleted()) {
        completed++;
      }
    }

    this.completedChapters = completed;

    if (completed >= this.totalChapters && this.totalChapters > 0) {
      this.status = TaskStatus.COMPLETED;
    }

    await this.save();
  }

  /**
   * Get pending chapters
   * @returns {Promise<Array>}
   */
  async getPendingChapters() {
    const pending = [];

    for (const chapterInfo of this.chapters) {
      const state = await this.getChapterState(chapterInfo.chapter, chapterInfo.url);
      if (!state.isCompleted()) {
        pending.push({
          ...chapterInfo,
          state,
        });
      }
    }

    return pending;
  }

  /**
   * Get all chapter states
   * @returns {Promise<ChapterState[]>}
   */
  async getAllChapterStates() {
    const states = [];

    for (const chapterInfo of this.chapters) {
      const state = await this.getChapterState(chapterInfo.chapter, chapterInfo.url);
      states.push(state);
    }

    return states;
  }

  /**
   * Get progress percentage
   * @returns {number}
   */
  getProgress() {
    if (this.totalChapters === 0) return 0;
    return Math.round((this.completedChapters / this.totalChapters) * 100);
  }

  /**
   * Start task
   * @returns {Promise<void>}
   */
  async start() {
    this.status = TaskStatus.RUNNING;
    await this.save();
  }

  /**
   * Pause task
   * @returns {Promise<void>}
   */
  async pause() {
    this.status = TaskStatus.PAUSED;
    await this.save();
  }

  /**
   * Complete task
   * @returns {Promise<void>}
   */
  async complete() {
    this.status = TaskStatus.COMPLETED;
    await this.save();
  }

  /**
   * Fail task
   * @returns {Promise<void>}
   */
  async fail() {
    this.status = TaskStatus.FAILED;
    await this.save();
  }

  /**
   * Get summary object
   * @returns {Object}
   */
  toSummary() {
    return {
      comic: this.comic,
      status: this.status,
      mode: this.mode,
      progress: `${this.completedChapters}/${this.totalChapters}`,
      percentage: this.getProgress(),
    };
  }
}

export default TaskState;
