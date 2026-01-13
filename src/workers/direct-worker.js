/**
 * Direct worker for executing HTTP-based download tasks
 */

import pLimit from 'p-limit';
import { DirectStrategy } from '../strategies/direct.js';
import { resourceManager } from './resource-manager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

/**
 * Direct HTTP worker class
 * Handles HTTP-based chapter downloads with concurrency
 */
export class DirectWorker {
  constructor(options = {}) {
    this.id = options.id || `direct-${Date.now()}`;
    this.log = logger.child(`DirectWorker:${this.id}`);
    this.strategy = null;
    this.running = false;
    this.concurrency = options.concurrency ?? config.get('direct.maxConcurrency', 8);
  }

  /**
   * Execute a chapter download task
   * @param {Object} task - Task to execute
   * @param {string} task.url - Chapter URL
   * @param {string} task.comic - Comic name
   * @param {string} task.chapter - Chapter ID
   * @param {string} task.outputDir - Output directory
   * @param {Object} task.state - Chapter state
   * @param {Function} [onProgress] - Progress callback
   * @returns {Promise<Object>} Result object
   */
  async execute(task, onProgress = null) {
    this.running = true;
    this.log.info(`Starting task: ${task.comic}/${task.chapter}`);

    try {
      // Create and prepare strategy
      this.strategy = new DirectStrategy();

      await this.strategy.prepare({
        url: task.url,
        comic: task.comic,
        chapter: task.chapter,
      });

      // Get chapter info
      const chapterInfo = await this.strategy.getChapterInfo();
      const totalPages = chapterInfo.totalPages;

      // Update state with total pages
      task.state.totalPages = totalPages;
      await task.state.save();

      this.log.info(`Downloading ${totalPages} pages with concurrency ${this.concurrency}`);

      // Create limiter for concurrent downloads
      const limit = pLimit(this.concurrency);

      let successCount = 0;
      let failCount = 0;
      let processedCount = 0;

      // Create download tasks for pending pages
      const downloadTasks = [];

      for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
        // Skip completed pages
        if (task.state.isPageDone(pageIndex)) {
          successCount++;
          processedCount++;
          continue;
        }

        // Create limited task
        const downloadTask = limit(async () => {
          // Acquire HTTP token
          await resourceManager.acquireHttpToken();

          try {
            // Fetch page
            const data = await this.strategy.fetchPage(pageIndex);

            // Save page
            await this.strategy.savePage(pageIndex, data, task.outputDir);

            // Mark as done
            await task.state.markPageDone(pageIndex);
            successCount++;

            this.log.debug(`Page ${pageIndex}/${totalPages} completed`);
          } catch (error) {
            failCount++;
            this.log.warn(`Page ${pageIndex} failed: ${error.message}`);
            await task.state.markPageFailed(pageIndex, error.message);
          } finally {
            // Release HTTP token
            resourceManager.releaseHttpToken();

            processedCount++;

            // Progress callback
            if (onProgress) {
              onProgress({
                current: processedCount,
                total: totalPages,
                success: successCount,
                failed: failCount,
              });
            }
          }
        });

        downloadTasks.push(downloadTask);
      }

      // Wait for all downloads to complete
      await Promise.all(downloadTasks);

      // Determine final status
      const success = failCount === 0;
      if (success) {
        await task.state.complete();
        this.log.info(`Task completed: ${successCount}/${totalPages} pages`);
      } else {
        await task.state.fail(`${failCount} pages failed`);
        this.log.warn(`Task finished with errors: ${successCount} success, ${failCount} failed`);
      }

      return {
        success,
        totalPages,
        successCount,
        failCount,
      };
    } catch (error) {
      this.log.error(`Task failed: ${error.message}`);
      await task.state.fail(error.message);
      throw error;
    } finally {
      // Cleanup
      if (this.strategy) {
        await this.strategy.cleanup();
        this.strategy = null;
      }

      this.running = false;
    }
  }

  /**
   * Check if worker is running
   * @returns {boolean}
   */
  isRunning() {
    return this.running;
  }

  /**
   * Stop the worker (cleanup)
   */
  async stop() {
    if (this.strategy) {
      await this.strategy.cleanup();
      this.strategy = null;
    }
    this.running = false;
  }
}

export default DirectWorker;
