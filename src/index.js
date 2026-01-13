#!/usr/bin/env node

/**
 * Comic Downloader CLI
 * A manga/comic downloader with browser and direct download modes
 */

import { Command } from "commander";
import { pipeline } from "./core/pipeline.js";
import { scheduler, Priority } from "./core/scheduler.js";
import stateManager from "./state/manager.js";
import { config } from "./utils/config.js";
import { logger, LOG_LEVELS } from "./utils/logger.js";

// Initialize config
config.load();

// Set log level from config
logger.setLevel(config.get("log.level", "info"));

const program = new Command();

program
  .name("comic-downloader")
  .description(
    "A manga/comic downloader with browser and direct download modes",
  )
  .version("2.0.0");

/**
 * Download command
 */
program
  .command("download")
  .description("Download a chapter or comic")
  .requiredOption("-u, --url <url>", "Chapter or comic URL")
  .option("-m, --mode <mode>", "Download mode (browser or direct)", "browser")
  .option("-o, --output <dir>", "Output directory")
  .option("-p, --proxy <url>", "Proxy URL (e.g., http://127.0.0.1:7890)")
  .option("--all", "Download all chapters (for comic URL)")
  .option("--headless", "Run browser in headless mode", true)
  .option("--no-headless", "Run browser with visible window")
  .action(async (options) => {
    const log = logger.child("CLI");

    try {
      log.info("Starting download...");
      log.info(`URL: ${options.url}`);
      log.info(`Mode: ${options.mode}`);

      // Override config if needed
      if (options.output) {
        config.set("download.outputDir", options.output);
      }
      if (options.headless !== undefined) {
        config.set("browser.headless", options.headless);
      }
      if (options.proxy) {
        config.setProxy(options.proxy);
        log.info(`Proxy: ${options.proxy}`);
      }

      const result = await pipeline.downloadChapter({
        url: options.url,
        mode: options.mode,
      });

      if (result.success) {
        if (result.skipped) {
          log.success("Chapter already downloaded (skipped)");
        } else {
          log.success(`Download completed!`);
          log.info(`Pages: ${result.successCount}/${result.totalPages}`);
          log.info(`Time: ${result.elapsed.toFixed(1)}s`);
        }
      } else {
        log.error(`Download failed: ${result.error || "Unknown error"}`);
        process.exit(1);
      }
    } catch (error) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Status command
 */
program
  .command("status")
  .description("Show download status")
  .action(async () => {
    const log = logger.child("CLI");

    try {
      await stateManager.init();
      await stateManager.printStatus();
    } catch (error) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Resume command
 */
program
  .command("resume")
  .description("Resume incomplete downloads")
  .option("-m, --mode <mode>", "Download mode (browser or direct)")
  .action(async (options) => {
    const log = logger.child("CLI");

    try {
      log.info("Resuming incomplete downloads...");

      const result = await pipeline.resume();

      if (result.resumed > 0) {
        log.success(`Resumed ${result.resumed} downloads`);
      } else {
        log.info("No incomplete downloads to resume");
      }
    } catch (error) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Config command
 */
program
  .command("config")
  .description("Show current configuration")
  .action(() => {
    console.log("\nCurrent Configuration:\n");
    console.log(JSON.stringify(config.getAll(), null, 2));
    console.log("");
  });

// Handle graceful shutdown
process.on("SIGINT", async () => {
  logger.warn("\nReceived SIGINT, shutting down...");
  await pipeline.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.warn("Received SIGTERM, shutting down...");
  await pipeline.stop();
  process.exit(0);
});

// Parse arguments
program.parse();
