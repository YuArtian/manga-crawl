/**
 * Download pipeline for orchestrating the download process
 */

import path from 'path';
import { DownloadContext } from './context.js';
import { workerPool } from '../workers/pool.js';
import stateManager from '../state/manager.js';
import { ensureDir } from '../utils/file.js';
import config from '../utils/config.js';
import logger from '../utils/logger.js';

/**
 * Download pipeline class
 * Orchestrates the entire download process
 */
class Pipeline {
  constructor(options = {}) {
    this.log = logger.child('Pipeline');
    this.onProgress = options.onProgress || null;
  }

  /**
   * Download a single chapter
   * @param {Object} options
   * @param {string} options.url - Chapter URL
   * @param {string} [options.mode='browser'] - Download mode
   * @param {string} [options.outputDir] - Output directory
   * @returns {Promise<Object>} Download result
   */
  async downloadChapter(options) {
    const context = new DownloadContext(options);
    await context.init();

    if (!context.isChapterUrl) {
      throw new Error('URL is not a chapter URL');
    }

    context.start();
    this.log.info(`Starting download: ${context.comic}/${context.chapter} (${context.mode} mode)`);

    // Initialize state manager
    await stateManager.init();

    // Get or create chapter state
    const state = await stateManager.getChapter({
      comic: context.comic,
      chapter: context.chapter,
      url: context.url,
    });

    // Check if already completed
    if (state.isCompleted()) {
      this.log.info('Chapter already completed, skipping');
      return {
        success: true,
        skipped: true,
        context: context.toSummary(),
      };
    }

    // Set mode and mark as running
    state.mode = context.mode;
    await state.start();

    // Ensure output directory exists
    const outputDir = context.getOutputDir();
    await ensureDir(outputDir);

    // Create task
    const task = context.toTask(state);

    // Execute with worker pool
    try {
      const result = await workerPool.submit(task, (progress) => {
        if (this.onProgress) {
          this.onProgress({
            ...progress,
            comic: context.comic,
            chapter: context.chapter,
          });
        }
        logger.progress(progress.current, progress.total, `${context.chapter}`);
      });

      context.end();

      return {
        success: result.success,
        skipped: false,
        totalPages: result.totalPages,
        successCount: result.successCount,
        failCount: result.failCount,
        elapsed: context.getElapsedTime(),
        context: context.toSummary(),
      };
    } catch (error) {
      context.end();
      this.log.error(`Download failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        elapsed: context.getElapsedTime(),
        context: context.toSummary(),
      };
    }
  }

  /**
   * Download multiple chapters
   * @param {Array<Object>} chapters - Array of chapter options
   * @param {Object} [options] - Pipeline options
   * @returns {Promise<Object>} Overall result
   */
  async downloadChapters(chapters, options = {}) {
    const results = [];
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < chapters.length; i++) {
      const chapterOptions = chapters[i];
      this.log.info(`Processing chapter ${i + 1}/${chapters.length}`);

      try {
        const result = await this.downloadChapter(chapterOptions);
        results.push(result);

        if (result.skipped) {
          skippedCount++;
        } else if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        this.log.error(`Chapter failed: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          url: chapterOptions.url,
        });
        failCount++;
      }
    }

    return {
      total: chapters.length,
      success: successCount,
      failed: failCount,
      skipped: skippedCount,
      results,
    };
  }

  /**
   * Resume incomplete downloads
   * @returns {Promise<Object>}
   */
  async resume() {
    this.log.info('Scanning for incomplete downloads...');

    await stateManager.init();
    const tasks = await stateManager.getIncompleteTasks();

    if (tasks.length === 0) {
      this.log.info('No incomplete tasks found');
      return { resumed: 0 };
    }

    this.log.info(`Found ${tasks.length} incomplete tasks`);

    let resumed = 0;
    for (const task of tasks) {
      const pendingChapters = await task.getPendingChapters();

      for (const chapter of pendingChapters) {
        try {
          await this.downloadChapter({
            url: chapter.url,
            mode: chapter.state.mode,
          });
          resumed++;
        } catch (error) {
          this.log.error(`Failed to resume ${chapter.chapter}: ${error.message}`);
        }
      }
    }

    return { resumed };
  }

  /**
   * Stop all downloads
   */
  async stop() {
    this.log.info('Stopping pipeline...');
    await workerPool.stop();
  }
}

// Singleton instance
const pipeline = new Pipeline();

export { Pipeline, pipeline };
export default Pipeline;
