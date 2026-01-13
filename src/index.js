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
import { getLibrary } from "./utils/library.js";
import { BrowserStrategy } from "./strategies/browser.js";
import * as manhuagui from "./parsers/manhuagui.js";

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
  .option("-u, --url <url>", "Chapter or comic URL")
  .option("-n, --name <name>", "Comic name from library (e.g., chainsawman)")
  .option("-m, --mode <mode>", "Download mode (browser or direct)", "browser")
  .option("-o, --output <dir>", "Output directory")
  .option("-p, --proxy <url>", "Proxy URL (e.g., http://127.0.0.1:7890)")
  .option("--all", "Download all chapters")
  .option("--headless", "Run browser in headless mode", true)
  .option("--no-headless", "Run browser with visible window")
  .action(async (options) => {
    const log = logger.child("CLI");

    try {
      // Validate options
      if (!options.url && !options.name) {
        log.error("Either --url or --name is required");
        process.exit(1);
      }

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

      // If using --name, get manga from library
      if (options.name) {
        const library = getLibrary();
        const manga = await library.getMangaByName(options.name);

        if (!manga) {
          log.error(`Manga not found in library: ${options.name}`);
          log.info("Use 'sync' command to add manga to library first");
          process.exit(1);
        }

        if (options.all) {
          // Download all chapters
          await downloadAllChapters(manga, options, log);
        } else {
          log.error("When using --name, --all flag is required");
          log.info("Use: npm start -- download -n chainsawman --all");
          process.exit(1);
        }
      } else {
        // Single URL download
        log.info("Starting download...");
        log.info(`URL: ${options.url}`);
        log.info(`Mode: ${options.mode}`);

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
      }
    } catch (error) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * Download all chapters for a manga
 */
async function downloadAllChapters(manga, options, log) {
  const library = getLibrary();

  // Check if chapters are synced
  if (!manga.chapterMap || manga.chapterMap.length === 0) {
    log.error(`No chapters synced for ${manga.name}`);
    log.info(`Run: npm start -- sync ${manga.name}`);
    process.exit(1);
  }

  const chapters = manga.chapterMap;
  log.info(`Starting batch download: ${manga.name}`);
  log.info(`Total chapters: ${chapters.length}`);
  log.info(`Mode: ${options.mode}`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chapterUrl = await library.buildChapterUrl(manga.name, ch.chapterId);

    log.info(`\n[${i + 1}/${chapters.length}] ${ch.title}`);

    try {
      const result = await pipeline.downloadChapter({
        url: chapterUrl,
        mode: options.mode,
        comicName: manga.name,
      });

      if (result.success) {
        if (result.skipped) {
          skipCount++;
          log.info(`  Skipped (already downloaded)`);
        } else {
          successCount++;
          log.success(
            `  Done: ${result.successCount}/${result.totalPages} pages`,
          );
        }
      } else {
        failCount++;
        log.error(`  Failed: ${result.error}`);
      }
    } catch (error) {
      failCount++;
      log.error(`  Error: ${error.message}`);
    }
  }

  log.info(`\n========== Summary ==========`);
  log.info(`Total: ${chapters.length}`);
  log.success(`Success: ${successCount}`);
  log.info(`Skipped: ${skipCount}`);
  if (failCount > 0) {
    log.error(`Failed: ${failCount}`);
  }
}

/**
 * Sync command - fetch chapter list from website and update library
 */
program
  .command("sync <name>")
  .description("Sync chapter list for a manga from website")
  .option("-p, --proxy <url>", "Proxy URL")
  .action(async (name, options) => {
    const log = logger.child("CLI");

    try {
      const library = getLibrary();
      const manga = await library.getMangaByName(name);

      if (!manga) {
        log.error(`Manga not found in library: ${name}`);
        log.info("Add it to index.json first with name and id");
        process.exit(1);
      }

      log.info(`Syncing chapters for: ${name} (ID: ${manga.id})`);

      // Set proxy if provided
      if (options.proxy) {
        config.setProxy(options.proxy);
        log.info(`Using proxy: ${options.proxy}`);
      }

      // Build manga URL
      const data = await library.load();
      const mangaUrl = `${data.site}/comic/${manga.id}/`;

      // Fetch chapter list using browser strategy
      const strategy = new BrowserStrategy({
        headless: true,
      });

      try {
        const allChapters = await strategy.fetchChapterList(mangaUrl);

        // Filter out volumes, sort by chapter number
        const chapters = manhuagui.sortChapters(
          manhuagui.filterChapters(allChapters, { includeVolumes: false }),
        );

        log.info(
          `Found ${allChapters.length} items, ${chapters.length} chapters (excluding volumes)`,
        );

        // Update library
        await library.updateChapters(name, chapters);

        log.success(`Synced ${chapters.length} chapters to library`);
        log.info(`First chapter: ${chapters[0]?.title || "N/A"}`);
        log.info(
          `Last chapter: ${chapters[chapters.length - 1]?.title || "N/A"}`,
        );
      } finally {
        await strategy.cleanup();
      }
    } catch (error) {
      log.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * List command - show manga in library
 */
program
  .command("list")
  .description("List manga in library")
  .action(async () => {
    const log = logger.child("CLI");

    try {
      const library = getLibrary();
      const mangaList = await library.listManga();

      if (mangaList.length === 0) {
        log.info("No manga in library");
        return;
      }

      console.log("\nManga in library:\n");
      for (const manga of mangaList) {
        const chapterCount =
          manga.chapterMap?.length || manga.chapters?.length || 0;
        console.log(
          `  ${manga.name} (ID: ${manga.id}) - ${chapterCount} chapters`,
        );
      }
      console.log("");
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
