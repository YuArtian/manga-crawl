/**
 * Task scheduler for managing download queues
 */

import { Pipeline } from './pipeline.js';
import stateManager from '../state/manager.js';
import logger from '../utils/logger.js';

/**
 * Task priority levels
 */
const Priority = {
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

/**
 * Scheduler class for managing download tasks
 */
class Scheduler {
  constructor(options = {}) {
    this.log = logger.child('Scheduler');
    this.pipeline = options.pipeline || new Pipeline();

    // Task queues by mode
    this.browserQueue = [];
    this.directQueue = [];

    // Running state
    this.running = false;
    this.paused = false;

    // Statistics
    this.stats = {
      submitted: 0,
      completed: 0,
      failed: 0,
    };
  }

  /**
   * Add a task to the queue
   * @param {Object} task - Task to add
   * @param {string} task.url - Chapter URL
   * @param {string} [task.mode='browser'] - Download mode
   * @param {number} [task.priority=Priority.NORMAL] - Task priority
   */
  enqueue(task) {
    const mode = task.mode || 'browser';
    const priority = task.priority || Priority.NORMAL;

    const queueItem = {
      ...task,
      mode,
      priority,
      addedAt: Date.now(),
    };

    // Add to appropriate queue
    const queue = mode === 'browser' ? this.browserQueue : this.directQueue;
    queue.push(queueItem);

    // Sort by priority
    queue.sort((a, b) => a.priority - b.priority);

    this.stats.submitted++;
    this.log.debug(`Task enqueued: ${task.url} (${mode} mode, priority ${priority})`);
  }

  /**
   * Add multiple tasks to the queue
   * @param {Array<Object>} tasks - Tasks to add
   */
  enqueueAll(tasks) {
    for (const task of tasks) {
      this.enqueue(task);
    }
  }

  /**
   * Get next task from queues
   * @returns {Object|null}
   */
  getNextTask() {
    // Prioritize browser queue (usually more important)
    if (this.browserQueue.length > 0) {
      return this.browserQueue.shift();
    }

    if (this.directQueue.length > 0) {
      return this.directQueue.shift();
    }

    return null;
  }

  /**
   * Start processing the queue
   * @param {Object} [options] - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async start(options = {}) {
    if (this.running) {
      this.log.warn('Scheduler is already running');
      return;
    }

    this.running = true;
    this.paused = false;
    this.log.info('Scheduler started');

    const results = [];

    while (this.running && !this.paused) {
      const task = this.getNextTask();

      if (!task) {
        this.log.debug('Queue empty, stopping');
        break;
      }

      this.log.info(`Processing task: ${task.url}`);

      try {
        const result = await this.pipeline.downloadChapter(task);
        results.push(result);

        if (result.success) {
          this.stats.completed++;
        } else {
          this.stats.failed++;
        }
      } catch (error) {
        this.log.error(`Task failed: ${error.message}`);
        this.stats.failed++;
        results.push({
          success: false,
          error: error.message,
          url: task.url,
        });
      }
    }

    this.running = false;
    this.log.info('Scheduler stopped');

    return {
      results,
      stats: this.getStats(),
    };
  }

  /**
   * Pause processing
   */
  pause() {
    this.paused = true;
    this.log.info('Scheduler paused');
  }

  /**
   * Resume processing
   */
  async resume() {
    if (!this.running) {
      return this.start();
    }

    this.paused = false;
    this.log.info('Scheduler resumed');
  }

  /**
   * Stop processing
   */
  async stop() {
    this.running = false;
    this.paused = false;
    await this.pipeline.stop();
    this.log.info('Scheduler stopped');
  }

  /**
   * Get queue status
   * @returns {Object}
   */
  getStatus() {
    return {
      running: this.running,
      paused: this.paused,
      browserQueueSize: this.browserQueue.length,
      directQueueSize: this.directQueue.length,
      totalQueued: this.browserQueue.length + this.directQueue.length,
    };
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Clear all queues
   */
  clear() {
    this.browserQueue = [];
    this.directQueue = [];
    this.log.info('Queues cleared');
  }
}

// Singleton instance
const scheduler = new Scheduler();

export { Scheduler, scheduler, Priority };
export default Scheduler;
