/**
 * Browser worker for executing browser-based download tasks
 */

import { BrowserStrategy } from '../strategies/browser.js';
import { resourceManager } from './resource-manager.js';
import logger from '../utils/logger.js';
import config from '../utils/config.js';

/**
 * Browser worker class
 * Handles browser-based chapter downloads
 */
export class BrowserWorker {
  constructor(options = {}) {
    this.id = options.id || `browser-${Date.now()}`;
    this.log = logger.child(`BrowserWorker:${this.id}`);
    this.strategy = null;
    this.running = false;
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

    // Acquire browser token
    await resourceManager.acquireBrowserToken();
    this.log.debug('Browser token acquired');

    try {
      // Create and prepare strategy
      this.strategy = new BrowserStrategy();

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

      this.log.info(`Downloading ${totalPages} pages`);

      // Download each page
      let successCount = 0;
      let failCount = 0;

      for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
        // Skip completed pages
        if (task.state.isPageDone(pageIndex)) {
          this.log.debug(`Skipping page ${pageIndex} (already done)`);
          successCount++;
          continue;
        }

        try {
          // Fetch page
          const data = await this.strategy.fetchPage(pageIndex);

          // Save page
          await this.strategy.savePage(pageIndex, data, task.outputDir);

          // Mark as done
          await task.state.markPageDone(pageIndex);
          successCount++;

          // Progress callback
          if (onProgress) {
            onProgress({
              current: pageIndex,
              total: totalPages,
              success: successCount,
              failed: failCount,
            });
          }

          this.log.debug(`Page ${pageIndex}/${totalPages} completed`);
        } catch (error) {
          failCount++;
          this.log.warn(`Page ${pageIndex} failed: ${error.message}`);
          await task.state.markPageFailed(pageIndex, error.message);
        }
      }

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

      // Release browser token
      resourceManager.releaseBrowserToken();
      this.log.debug('Browser token released');

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

export default BrowserWorker;
