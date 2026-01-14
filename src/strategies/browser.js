/**
 * Browser strategy using Playwright for downloading
 * This strategy controls a real browser to handle JS-rendered content
 */

import { chromium } from "playwright";
import path from "path";
import { BaseStrategy } from "./base.js";
import { writeBinaryAtomic, ensureDir } from "../utils/file.js";
import * as manhuagui from "../parsers/manhuagui.js";
import config from "../utils/config.js";
import logger from "../utils/logger.js";

/**
 * Browser-based download strategy
 * Uses Playwright to render pages and extract images
 */
export class BrowserStrategy extends BaseStrategy {
  constructor(options = {}) {
    super(options);
    this.name = "browser";
    this.browser = null;
    this.page = null;
    this.context = null;

    // Configuration
    this.headless = options.headless ?? config.get("browser.headless", true);
    this.timeout = options.timeout ?? config.get("browser.timeout", 30000);
    this.viewport =
      options.viewport ??
      config.get("browser.viewport", { width: 390, height: 844 });
    this.userAgent = options.userAgent ?? config.get("browser.userAgent");

    // Proxy configuration
    this.proxyUrl = config.getProxy();

    // Chapter data
    this.chapterUrl = null;
    this.comic = null;
    this.chapter = null;
    this.imageData = null;
    this.pageUrls = [];
    this.totalPages = 0;
  }

  /**
   * Prepare the browser and load the chapter page
   * @param {Object} context - Download context
   */
  async prepare(context) {
    this.chapterUrl = context.url;
    this.comic = context.comic;
    this.chapter = context.chapter;

    const log = logger.child("Browser");
    log.info(`Preparing browser for ${this.chapterUrl}`);

    // Log proxy info
    if (this.proxyUrl) {
      log.info(`Using proxy: ${this.proxyUrl}`);
    }

    // Launch browser
    this.browser = await chromium.launch({
      headless: this.headless,
    });

    // Create context with mobile viewport and optional proxy
    const contextOptions = {
      viewport: this.viewport,
      userAgent: this.userAgent,
    };

    // Add proxy if configured
    if (this.proxyUrl) {
      contextOptions.proxy = { server: this.proxyUrl };
    }

    this.context = await this.browser.newContext(contextOptions);

    // Create page
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.timeout);

    // Navigate to chapter page
    log.info("Loading chapter page...");
    await this.page.goto(this.chapterUrl, {
      waitUntil: "domcontentloaded",
      timeout: this.timeout,
    });

    // Wait a bit for JS to execute
    await this.page.waitForTimeout(2000);

    // Debug: Log page title and URL
    const pageTitle = await this.page.title();
    const pageUrl = this.page.url();
    log.info(`Page loaded - Title: "${pageTitle}", URL: ${pageUrl}`);

    // Debug: Check what's on the page
    const debugInfo = await this.page.evaluate(() => {
      return {
        hasImgData: typeof window.img_data !== "undefined",
        imgDataType: typeof window.img_data,
        hasVgRData: !!document.querySelector(".vg-r-data"),
        bodyLength: document.body?.innerHTML?.length || 0,
        scripts: Array.from(document.querySelectorAll("script")).length,
        title: document.title,
        // Check for common anti-bot elements
        hasCloudflare: !!document.querySelector(
          "#cf-wrapper, .cf-browser-verification",
        ),
        hasCaptcha: !!document.querySelector(
          '[class*="captcha"], [id*="captcha"]',
        ),
        bodyPreview: document.body?.innerText?.slice(0, 500) || "",
      };
    });

    log.info(
      `Debug info: hasImgData=${debugInfo.hasImgData}, hasVgRData=${debugInfo.hasVgRData}, bodyLength=${debugInfo.bodyLength}`,
    );
    log.info(
      `Debug: scripts=${debugInfo.scripts}, hasCloudflare=${debugInfo.hasCloudflare}, hasCaptcha=${debugInfo.hasCaptcha}`,
    );
    log.info(`Page text preview: ${debugInfo.bodyPreview.slice(0, 200)}...`);

    // Wait for SMH.reader to be available (the site uses SMH.reader for image data)
    try {
      await this.page.waitForFunction(
        () => {
          return (
            typeof window.SMH !== "undefined" &&
            typeof window.SMH.reader !== "undefined"
          );
        },
        { timeout: this.timeout },
      );
      log.info("SMH.reader is available");
    } catch (waitError) {
      log.warn("SMH.reader not found, will try to extract from HTML");
    }

    log.info("Page loaded successfully");
  }

  /**
   * Get chapter information from the loaded page
   * @returns {Promise<Object>}
   */
  async getChapterInfo() {
    const log = logger.child("Browser");

    // Extract image data from page using SMH.reader config
    const data = await this.page.evaluate(() => {
      const debug = [];

      // Method 1: Look for the manga image that's already loaded
      const mangaImg = document.querySelector("#manga img");
      if (mangaImg && mangaImg.src) {
        debug.push("Found manga img: " + mangaImg.src);
      }

      // Method 2: Extract from packed script in HTML
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const content = script.textContent || "";

        // Check if this is the packed script with SMH.reader
        if (content.includes("SMH.reader") || content.includes("SMH.imgData")) {
          debug.push("Found script with SMH.reader");

          // Find the packed function - updated regex
          const match = content.match(
            /\}(?:\(|\()['"]([^'"]+)['"],\s*(\d+),\s*(\d+),\s*['"]([^'"]+)['"](?:\[.*?\])?\(['"]([^'"]+)['"]\)/,
          );

          if (!match) {
            // Try alternative format
            const altMatch = content.match(
              /\}\('([^']+)',(\d+),(\d+),'([^']+)'\.split/,
            );
            if (altMatch) {
              debug.push("Found alt packed format");
              const p = altMatch[1];
              const a = parseInt(altMatch[2], 10);
              const k = altMatch[4].split("|");
              let c = parseInt(altMatch[3], 10);

              // Base conversion function
              const e = (c) => {
                return (
                  (c < a ? "" : e(parseInt(c / a))) +
                  ((c = c % a) > 35
                    ? String.fromCharCode(c + 29)
                    : c.toString(36))
                );
              };

              // Replace placeholders
              let unpacked = p;
              const originalC = c;
              while (c--) {
                if (k[c]) {
                  unpacked = unpacked.replace(
                    new RegExp("\\b" + e(c) + "\\b", "g"),
                    k[c],
                  );
                }
              }

              debug.push("Unpacked: " + unpacked.substring(0, 200));

              // Extract config - try multiple patterns
              let configMatch = unpacked.match(
                /SMH\.reader\((\{[\s\S]*?\})\)\.init/,
              );
              if (!configMatch) {
                configMatch = unpacked.match(
                  /SMH\.(?:reader|imgData)\((\{[^}]+\})\)/,
                );
              }

              if (configMatch) {
                debug.push("Found config match");
                try {
                  // Fix the config string - it might have unquoted keys
                  let configStr = configMatch[1];
                  const config = new Function("return " + configStr)();
                  debug.push(
                    "Parsed config, images count: " +
                      (config.images?.length || 0),
                  );

                  return {
                    host: config.host || "i",
                    images: config.images || [],
                    total: config.images?.length || config.count || 0,
                    sl: config.sl || {},
                    title: document.title || "",
                    debug: debug,
                  };
                } catch (e) {
                  debug.push("Parse error: " + e.message);
                }
              }
            }
          }
        }
      }

      // Method 3: Get the page count from the UI and construct URLs
      const pageInfo = document.querySelector(".manga-page");
      if (pageInfo) {
        const match = pageInfo.textContent.match(/(\d+)\/(\d+)P/);
        if (match) {
          const total = parseInt(match[2], 10);
          debug.push("Found page count from UI: " + total);

          // Try to get image URL pattern from the loaded image
          const img = document.querySelector("#manga img");
          if (img && img.src) {
            const imgSrc = img.src;
            debug.push("Current img src: " + imgSrc);

            // Extract base URL and pattern
            // Example: https://i.hamreus.com/ps1/d/电锯人/第01回/1.jpg.webp
            const urlMatch = imgSrc.match(
              /(https?:\/\/[^/]+)(.*?)(\d+)(\.(?:jpg|png|webp)(?:\.webp)?)/,
            );
            if (urlMatch) {
              const host = urlMatch[1];
              const pathPrefix = urlMatch[2];
              const ext = urlMatch[4];

              // Build all image URLs
              const images = [];
              for (let i = 1; i <= total; i++) {
                images.push(pathPrefix + i + ext);
              }

              return {
                host: host,
                images: images,
                total: total,
                sl: {},
                title: document.title || "",
                debug: debug,
              };
            }
          }
        }
      }

      // Method 4: Fallback to old img_data format
      if (typeof window.img_data !== "undefined") {
        try {
          const decoded = JSON.parse(atob(window.img_data));
          const vrData = document.querySelector(".vg-r-data");
          return {
            host: vrData?.dataset?.host || "",
            imgPre: vrData?.dataset?.img_pre || "",
            images: decoded,
            total: decoded.length,
            title: document.title || "",
            debug: debug,
          };
        } catch (e) {
          debug.push("img_data error: " + e.message);
        }
      }

      return { debug: debug, error: "No data found" };
    });

    // Log debug info
    if (data?.debug) {
      data.debug.forEach((msg) => log.debug(`Extract debug: ${msg}`));
    }

    if (!data || data.error || !data.images || data.images.length === 0) {
      log.error(`Data extraction failed: ${JSON.stringify(data)}`);
      throw new Error("Failed to extract image data from page");
    }

    log.info(`Extracted config: host=${data.host}, total=${data.total}`);
    this.imageData = data;

    // Build page URLs
    const host = data.host.includes("://")
      ? data.host
      : `https://${data.host}.hamreus.com`;
    const imgPre = data.imgPre || "";

    // Build query string from sl parameters
    const slParams = data.sl
      ? Object.entries(data.sl)
          .map(([k, v]) => `${k}=${v}`)
          .join("&")
      : "";
    const suffix = slParams ? `?${slParams}` : "";

    this.pageUrls = data.images.map((img) => {
      // Handle both string format (new) and object format (old)
      if (typeof img === "string") {
        return `${host}${img}${suffix}`;
      } else {
        const filename = img.img_webp || img.img;
        return `${host}${imgPre}${filename}`;
      }
    });

    this.totalPages = data.total;
    log.info(`Found ${this.totalPages} pages`);
    log.debug(`First image URL: ${this.pageUrls[0]}`);

    return {
      totalPages: this.totalPages,
      title: data.title,
    };
  }

  /**
   * Get all page URLs
   * @returns {Promise<string[]>}
   */
  async getPageUrls() {
    if (this.pageUrls.length === 0) {
      await this.getChapterInfo();
    }
    return this.pageUrls;
  }

  /**
   * Fetch a single page image
   * @param {number} pageIndex - 1-based page index
   * @param {string} [url] - Optional URL override
   * @returns {Promise<Buffer>}
   */
  /**
   * Navigate to a specific page and capture the image via network interception
   * This method bypasses CORS by intercepting the actual network response
   */
  async fetchPage(pageIndex, url = null) {
    const log = logger.child("Browser");

    log.info(`Fetching page ${pageIndex}/${this.totalPages}`);

    // Store captured image data
    let capturedImageData = null;
    let capturedImageUrl = null;

    // Set up response listener to capture image data
    const responseHandler = async (response) => {
      const url = response.url();
      // Check if this is an image from the manga CDN
      if (url.includes("hamreus.com") && /\.(jpg|png|webp)/i.test(url)) {
        try {
          const status = response.status();
          if (status === 200) {
            const buffer = await response.body();
            if (buffer && buffer.length > 1000) {
              // Ignore tiny responses
              capturedImageData = buffer;
              capturedImageUrl = url;
              log.debug(`Captured image: ${url} (${buffer.length} bytes)`);
            }
          }
        } catch (e) {
          // Response body might not be available, ignore
        }
      }
    };

    this.page.on("response", responseHandler);

    try {
      // Navigate to the specific page using hash parameter
      const pageUrl = `${this.chapterUrl}#p=${pageIndex}`;
      await this.page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Wait for the image to load
      await this.page.waitForTimeout(2000);

      // Wait for image element to have a valid src
      try {
        await this.page.waitForFunction(
          () => {
            const img = document.querySelector("#manga img");
            return img && img.src && img.complete && img.naturalWidth > 0;
          },
          { timeout: 10000 },
        );
      } catch (e) {
        log.debug(`Image load wait timeout, checking captured data...`);
      }

      // Give a bit more time for response handler to process
      await this.page.waitForTimeout(500);

      // Check if we captured the image via network
      if (capturedImageData && capturedImageData.length > 1000) {
        log.debug(
          `Page ${pageIndex} captured via network: ${capturedImageData.length} bytes`,
        );
        return capturedImageData;
      }

      // If network capture failed, try to get the image URL and fetch directly
      const imgSrc = await this.page.evaluate(() => {
        const img = document.querySelector("#manga img");
        return img ? img.src : null;
      });

      if (imgSrc && imgSrc.startsWith("http")) {
        log.debug(`Trying direct fetch for: ${imgSrc}`);

        // Use Playwright's request context to fetch with proper headers
        const response = await this.context.request.get(imgSrc, {
          headers: {
            Referer: this.chapterUrl,
            Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
          },
        });

        if (response.ok()) {
          const buffer = await response.body();
          log.debug(
            `Page ${pageIndex} fetched directly: ${buffer.length} bytes`,
          );
          return buffer;
        }

        throw new Error(`Direct fetch failed with status ${response.status()}`);
      }

      throw new Error(`No image data captured for page ${pageIndex}`);
    } finally {
      // Remove the response handler
      this.page.off("response", responseHandler);
    }
  }

  /**
   * Save page to disk
   * @param {number} pageIndex - 1-based page index
   * @param {Buffer} data - Image data
   * @param {string} outputDir - Output directory
   * @returns {Promise<string>}
   */
  async savePage(pageIndex, data, outputDir) {
    const log = logger.child("Browser");

    // Determine file extension from URL or default to jpg
    const url = this.pageUrls[pageIndex - 1] || "";
    let ext = ".jpg";
    if (url.includes(".webp")) ext = ".webp";
    else if (url.includes(".png")) ext = ".png";

    // Create filename with zero-padded index
    const filename = `${String(pageIndex).padStart(3, "0")}${ext}`;
    const filePath = path.join(outputDir, filename);

    // Ensure directory exists and write file
    await ensureDir(outputDir);
    await writeBinaryAtomic(filePath, data);

    log.debug(`Saved page ${pageIndex} to ${filePath}`);
    return filePath;
  }

  /**
   * Fetch chapter list from comic homepage
   * @param {string} comicUrl - Comic homepage URL (e.g., https://m.manhuagui.com/comic/30252/)
   * @returns {Promise<Array>} Array of chapter info
   */
  async fetchChapterList(comicUrl) {
    const log = logger.child("Browser");
    log.info(`Fetching chapter list from: ${comicUrl}`);

    // Launch browser if not already running
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.headless,
      });
    }

    // Create new context with proxy if configured
    const contextOptions = {
      viewport: this.viewport,
      userAgent:
        this.userAgent ||
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    };

    if (this.proxyUrl) {
      contextOptions.proxy = { server: this.proxyUrl };
    }

    const context = await this.browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      // Navigate to manga page
      await page.goto(comicUrl, {
        waitUntil: "domcontentloaded",
        timeout: this.timeout,
      });

      // Wait for page to load, then get HTML
      // The chapter list may be hidden initially, so we just wait for DOM
      await page.waitForTimeout(2000);

      // Extract chapter list from page HTML (works even if element is hidden)
      const html = await page.content();
      const chapters = manhuagui.extractChapterList(html);

      if (chapters.length === 0) {
        log.warn("No chapters found, page might need more time to load");
        // Try waiting a bit more
        await page.waitForTimeout(3000);
        const retryHtml = await page.content();
        const retryChapters = manhuagui.extractChapterList(retryHtml);
        if (retryChapters.length > 0) {
          log.info(`Found ${retryChapters.length} chapters (after retry)`);
          return retryChapters;
        }
      }

      log.info(`Found ${chapters.length} chapters`);
      return chapters;
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    const log = logger.child("Browser");
    log.debug("Cleaning up browser...");

    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }

    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }

    log.debug("Browser cleanup complete");
  }

  /**
   * Check if URL is supported
   * @param {string} url
   * @returns {boolean}
   */
  static supports(url) {
    return manhuagui.isManhuaguiUrl(url);
  }
}

export default BrowserStrategy;
