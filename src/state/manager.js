/**
 * State manager for coordinating all state operations
 */

import path from 'path';
import { ensureDir, listDirs, listFiles, readJson } from '../utils/file.js';
import { ChapterState, ChapterStatus } from './chapter-state.js';
import { TaskState, TaskStatus } from './task-state.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * State manager singleton for managing all download states
 */
class StateManager {
  constructor() {
    this.stateDir = null;
    this.initialized = false;
    this._tasks = new Map();
  }

  /**
   * Initialize state manager
   * @param {string} [stateDir] - Custom state directory
   * @returns {Promise<StateManager>}
   */
  async init(stateDir = null) {
    this.stateDir = stateDir || config.getStateDir();
    await ensureDir(this.stateDir);
    this.initialized = true;
    return this;
  }

  /**
   * Ensure manager is initialized
   */
  ensureInit() {
    if (!this.initialized) {
      throw new Error('StateManager not initialized. Call init() first.');
    }
  }

  /**
   * Get or create task state
   * @param {Object} options
   * @param {string} options.comic - Comic name/ID
   * @param {string} options.url - Comic URL
   * @param {string} [options.mode='browser'] - Download mode
   * @returns {Promise<TaskState>}
   */
  async getTask(options) {
    this.ensureInit();

    const key = options.comic;

    if (this._tasks.has(key)) {
      return this._tasks.get(key);
    }

    const task = new TaskState({
      ...options,
      stateDir: this.stateDir,
    });

    await task.load();
    this._tasks.set(key, task);

    return task;
  }

  /**
   * Get chapter state
   * @param {Object} options
   * @param {string} options.comic - Comic name/ID
   * @param {string} options.chapter - Chapter ID
   * @param {string} options.url - Chapter URL
   * @returns {Promise<ChapterState>}
   */
  async getChapter(options) {
    this.ensureInit();

    const state = new ChapterState({
      ...options,
      stateDir: this.stateDir,
    });

    await state.load();
    return state;
  }

  /**
   * Scan and load all existing tasks
   * @returns {Promise<TaskState[]>}
   */
  async scanTasks() {
    this.ensureInit();

    const tasks = [];
    const comicDirs = await listDirs(this.stateDir);

    for (const comicDir of comicDirs) {
      const taskFile = path.join(comicDir, '_task.json');
      const taskData = await readJson(taskFile);

      if (taskData) {
        const task = new TaskState({
          comic: taskData.comic,
          url: taskData.url,
          stateDir: this.stateDir,
        });
        await task.load();
        this._tasks.set(taskData.comic, task);
        tasks.push(task);
      }
    }

    return tasks;
  }

  /**
   * Get all running/incomplete tasks
   * @returns {Promise<TaskState[]>}
   */
  async getIncompleteTasks() {
    const tasks = await this.scanTasks();
    return tasks.filter(task =>
      task.status !== TaskStatus.COMPLETED
    );
  }

  /**
   * Get all running chapters across all tasks
   * @returns {Promise<ChapterState[]>}
   */
  async getRunningChapters() {
    const tasks = await this.scanTasks();
    const chapters = [];

    for (const task of tasks) {
      const states = await task.getAllChapterStates();
      for (const state of states) {
        if (state.status === ChapterStatus.RUNNING) {
          chapters.push(state);
        }
      }
    }

    return chapters;
  }

  /**
   * Clean up completed task states (optional)
   * @param {string} comic - Comic name/ID
   * @returns {Promise<void>}
   */
  async cleanupTask(comic) {
    this.ensureInit();
    // Implementation depends on requirements
    // Could delete state files for completed tasks
    logger.debug(`Cleanup requested for ${comic}`);
  }

  /**
   * Get overall statistics
   * @returns {Promise<Object>}
   */
  async getStatistics() {
    const tasks = await this.scanTasks();

    let totalChapters = 0;
    let completedChapters = 0;
    let runningChapters = 0;
    let failedChapters = 0;

    for (const task of tasks) {
      const states = await task.getAllChapterStates();
      totalChapters += states.length;

      for (const state of states) {
        if (state.status === ChapterStatus.COMPLETED) {
          completedChapters++;
        } else if (state.status === ChapterStatus.RUNNING) {
          runningChapters++;
        } else if (state.status === ChapterStatus.FAILED) {
          failedChapters++;
        }
      }
    }

    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      totalChapters,
      completedChapters,
      runningChapters,
      failedChapters,
      pendingChapters: totalChapters - completedChapters - runningChapters - failedChapters,
    };
  }

  /**
   * Print status summary
   * @returns {Promise<void>}
   */
  async printStatus() {
    const stats = await this.getStatistics();
    const tasks = await this.scanTasks();

    console.log('\n=== Download Status ===\n');
    console.log(`Tasks: ${stats.completedTasks}/${stats.totalTasks} completed`);
    console.log(`Chapters: ${stats.completedChapters}/${stats.totalChapters} completed`);
    console.log(`Running: ${stats.runningChapters}, Failed: ${stats.failedChapters}\n`);

    for (const task of tasks) {
      const summary = task.toSummary();
      const statusIcon = {
        [TaskStatus.COMPLETED]: '✓',
        [TaskStatus.RUNNING]: '►',
        [TaskStatus.PAUSED]: '⏸',
        [TaskStatus.FAILED]: '✗',
        [TaskStatus.PENDING]: '○',
      }[summary.status] || '?';

      console.log(`${statusIcon} ${summary.comic}: ${summary.progress} (${summary.percentage}%)`);
    }

    console.log('');
  }
}

// Singleton instance
const stateManager = new StateManager();

export { StateManager, stateManager };
export default stateManager;
