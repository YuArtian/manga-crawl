/**
 * Configuration management utility
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default configuration
const DEFAULT_CONFIG = {
  browser: {
    headless: true,
    maxInstances: 2,
    timeout: 30000,
    viewport: {
      width: 390,
      height: 844,
    },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  direct: {
    maxConcurrency: 8,
    timeout: 15000,
    retries: 3,
    retryDelay: 1000,
  },
  download: {
    outputDir: "./downloads",
    stateDir: "./state",
  },
  proxy: {
    enabled: false,
    url: "",
  },
  log: {
    level: "info",
  },
};

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} - Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] instanceof Object &&
      key in target &&
      target[key] instanceof Object
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Load configuration from file
 * @param {string} configPath - Path to config file
 * @returns {Object} - Configuration object
 */
function loadConfigFile(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}:`, error.message);
  }
  return {};
}

class Config {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loaded = false;
  }

  /**
   * Load configuration from default locations
   * @param {string} [customPath] - Custom config file path
   * @returns {Config}
   */
  load(customPath = null) {
    // Start with defaults
    let config = { ...DEFAULT_CONFIG };

    // Try to load from config directory
    const configDir = path.resolve(__dirname, "../../config");
    const defaultConfigPath = path.join(configDir, "default.json");
    config = deepMerge(config, loadConfigFile(defaultConfigPath));

    // Try to load from project root
    const rootConfigPath = path.resolve(
      process.cwd(),
      "comic-downloader.config.json",
    );
    config = deepMerge(config, loadConfigFile(rootConfigPath));

    // Load custom config if provided
    if (customPath) {
      config = deepMerge(config, loadConfigFile(customPath));
    }

    // Load from environment variables
    if (process.env.COMIC_HEADLESS !== undefined) {
      config.browser.headless = process.env.COMIC_HEADLESS === "true";
    }
    if (process.env.COMIC_OUTPUT_DIR) {
      config.download.outputDir = process.env.COMIC_OUTPUT_DIR;
    }
    if (process.env.COMIC_LOG_LEVEL) {
      config.log.level = process.env.COMIC_LOG_LEVEL;
    }

    // Load proxy from environment variables (http_proxy, https_proxy, COMIC_PROXY)
    const envProxy =
      process.env.COMIC_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy;
    if (envProxy) {
      config.proxy.enabled = true;
      config.proxy.url = envProxy;
    }

    this.config = config;
    this.loaded = true;
    return this;
  }

  /**
   * Get configuration value by path
   * @param {string} keyPath - Dot-separated path (e.g., 'browser.timeout')
   * @param {any} defaultValue - Default value if path not found
   * @returns {any}
   */
  get(keyPath, defaultValue = undefined) {
    if (!this.loaded) {
      this.load();
    }

    const keys = keyPath.split(".");
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value
   * @param {string} keyPath - Dot-separated path
   * @param {any} value - Value to set
   */
  set(keyPath, value) {
    const keys = keyPath.split(".");
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    if (!this.loaded) {
      this.load();
    }
    return { ...this.config };
  }

  /**
   * Get output directory (resolved to absolute path)
   * @returns {string}
   */
  getOutputDir() {
    return path.resolve(process.cwd(), this.get("download.outputDir"));
  }

  /**
   * Get state directory (resolved to absolute path)
   * @returns {string}
   */
  getStateDir() {
    return path.resolve(process.cwd(), this.get("download.stateDir"));
  }

  /**
   * Get proxy URL if enabled
   * @returns {string|null} Proxy URL or null if disabled
   */
  getProxy() {
    if (!this.loaded) {
      this.load();
    }

    const enabled = this.get("proxy.enabled", false);
    const url = this.get("proxy.url", "");

    if (enabled && url) {
      return url;
    }

    return null;
  }

  /**
   * Set proxy URL and enable it
   * @param {string} proxyUrl - Proxy URL (e.g., http://127.0.0.1:7890)
   */
  setProxy(proxyUrl) {
    if (proxyUrl) {
      this.set("proxy.enabled", true);
      this.set("proxy.url", proxyUrl);
    } else {
      this.set("proxy.enabled", false);
      this.set("proxy.url", "");
    }
  }
}

// Singleton instance
const config = new Config();

export { Config, config, DEFAULT_CONFIG };
export default config;
