/**
 * Logger utility with colored output and log levels
 */

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  constructor(options = {}) {
    this.level = LOG_LEVELS[options.level] ?? LOG_LEVELS.info;
    this.prefix = options.prefix || '';
  }

  /**
   * Set log level
   * @param {string} level - Log level (debug, info, warn, error)
   */
  setLevel(level) {
    this.level = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  /**
   * Get timestamp string
   * @returns {string}
   */
  getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Format message with prefix
   * @param {string} level - Log level label
   * @param {string} color - Color code
   * @param {any[]} args - Arguments to log
   */
  format(level, color, ...args) {
    const timestamp = `${COLORS.gray}[${this.getTimestamp()}]${COLORS.reset}`;
    const levelTag = `${color}[${level}]${COLORS.reset}`;
    const prefix = this.prefix ? `${COLORS.cyan}[${this.prefix}]${COLORS.reset}` : '';
    console.log(timestamp, levelTag, prefix, ...args);
  }

  /**
   * Debug level log
   * @param  {...any} args
   */
  debug(...args) {
    if (this.level <= LOG_LEVELS.debug) {
      this.format('DEBUG', COLORS.gray, ...args);
    }
  }

  /**
   * Info level log
   * @param  {...any} args
   */
  info(...args) {
    if (this.level <= LOG_LEVELS.info) {
      this.format('INFO', COLORS.green, ...args);
    }
  }

  /**
   * Warning level log
   * @param  {...any} args
   */
  warn(...args) {
    if (this.level <= LOG_LEVELS.warn) {
      this.format('WARN', COLORS.yellow, ...args);
    }
  }

  /**
   * Error level log
   * @param  {...any} args
   */
  error(...args) {
    if (this.level <= LOG_LEVELS.error) {
      this.format('ERROR', COLORS.red, ...args);
    }
  }

  /**
   * Success message (always shown)
   * @param  {...any} args
   */
  success(...args) {
    this.format('SUCCESS', COLORS.green, ...args);
  }

  /**
   * Progress message
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} message - Progress message
   */
  progress(current, total, message = '') {
    const percent = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    process.stdout.write(`\r${COLORS.cyan}[${bar}] ${percent}% (${current}/${total})${COLORS.reset} ${message}`);
    if (current === total) {
      console.log(); // New line when complete
    }
  }

  /**
   * Create a child logger with prefix
   * @param {string} prefix - Prefix for the child logger
   * @returns {Logger}
   */
  child(prefix) {
    return new Logger({
      level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.level),
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
    });
  }
}

// Default logger instance
const logger = new Logger();

export { Logger, logger, LOG_LEVELS };
export default logger;
