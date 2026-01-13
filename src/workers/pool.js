/**
 * Worker pool for managing download workers
 */

import { BrowserWorker } from './browser-worker.js';
import { DirectWorker } from './direct-worker.js';
import { ResourceManager, resourceManager } from './resource-manager.js';
import logger from '../utils/logger.js';

/**
 * Worker pool class
 * Manages browser and direct workers for downloading
 */
class WorkerPool {
  constructor(options = {}) {
    this.log = logger.child('WorkerPool');
    this.resourceManager = options.resourceManager || resourceManager;

    // Active workers
    this.browserWorkers = new Map();
    this.directWorkers = new Map();

    // Task queues
    this.browserQueue = [];
    this.directQueue = [];

    // Running state
    this.running = false;
    this.workerIdCounter = 0;
  }

  /**
   * Submit a task to the pool
   * @param {Object} task - Task to execute
   * @param {string} task.mode - 'browser' or 'direct'
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} Task result
   */
  async submit(task, onProgress = null) {
    if (task.mode === 'browser') {
      return this.submitBrowserTask(task, onProgress);
    } else {
      return this.submitDirectTask(task, onProgress);
    }
  }

  /**
   * Submit a browser task
   * @param {Object} task - Task to execute
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>}
   */
  async submitBrowserTask(task, onProgress = null) {
    const workerId = `browser-${++this.workerIdCounter}`;
    const worker = new BrowserWorker({ id: workerId });

    this.browserWorkers.set(workerId, worker);
    this.log.debug(`Created browser worker: ${workerId}`);

    try {
      const result = await worker.execute(task, onProgress);
      return result;
    } finally {
      this.browserWorkers.delete(workerId);
      this.log.debug(`Removed browser worker: ${workerId}`);
    }
  }

  /**
   * Submit a direct task
   * @param {Object} task - Task to execute
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>}
   */
  async submitDirectTask(task, onProgress = null) {
    const workerId = `direct-${++this.workerIdCounter}`;
    const worker = new DirectWorker({ id: workerId });

    this.directWorkers.set(workerId, worker);
    this.log.debug(`Created direct worker: ${workerId}`);

    try {
      const result = await worker.execute(task, onProgress);
      return result;
    } finally {
      this.directWorkers.delete(workerId);
      this.log.debug(`Removed direct worker: ${workerId}`);
    }
  }

  /**
   * Get pool status
   * @returns {Object}
   */
  getStatus() {
    return {
      browserWorkers: this.browserWorkers.size,
      directWorkers: this.directWorkers.size,
      resources: this.resourceManager.getStatus(),
    };
  }

  /**
   * Stop all workers
   */
  async stop() {
    this.log.info('Stopping all workers...');

    // Stop browser workers
    for (const [id, worker] of this.browserWorkers) {
      this.log.debug(`Stopping browser worker: ${id}`);
      await worker.stop();
    }
    this.browserWorkers.clear();

    // Stop direct workers
    for (const [id, worker] of this.directWorkers) {
      this.log.debug(`Stopping direct worker: ${id}`);
      await worker.stop();
    }
    this.directWorkers.clear();

    // Reset resource manager
    this.resourceManager.reset();

    this.log.info('All workers stopped');
  }
}

// Singleton instance
const workerPool = new WorkerPool();

export { WorkerPool, workerPool };
export default WorkerPool;
