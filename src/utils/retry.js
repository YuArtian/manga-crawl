/**
 * Retry utility with exponential backoff
 */

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry options
 * @typedef {Object} RetryOptions
 * @property {number} [retries=3] - Maximum number of retries
 * @property {number} [delay=1000] - Initial delay in ms
 * @property {number} [maxDelay=30000] - Maximum delay in ms
 * @property {number} [factor=2] - Exponential backoff factor
 * @property {Function} [onRetry] - Callback on retry
 * @property {Function} [shouldRetry] - Function to determine if should retry
 */

/**
 * Default should retry function
 * @param {Error} error - The error that occurred
 * @returns {boolean}
 */
function defaultShouldRetry(error) {
  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  // Retry on HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  // Retry on rate limiting
  if (error.status === 429) {
    return true;
  }
  // Don't retry on client errors (4xx except 429)
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  // Default: retry on unknown errors
  return true;
}

/**
 * Execute function with retry
 * @param {Function} fn - Async function to execute
 * @param {RetryOptions} [options={}] - Retry options
 * @returns {Promise<any>}
 */
export async function retry(fn, options = {}) {
  const {
    retries = 3,
    delay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(error, attempt + 1);
      }

      // Wait before retrying
      await sleep(currentDelay);

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper with preset options
 * @param {RetryOptions} options - Retry options
 * @returns {Function} - Retry function
 */
export function createRetry(options) {
  return (fn) => retry(fn, options);
}

/**
 * Timeout wrapper for promises
 * @param {Promise} promise - Promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} [message='Operation timed out'] - Timeout message
 * @returns {Promise}
 */
export function withTimeout(promise, ms, message = 'Operation timed out') {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = 'ETIMEDOUT';
      reject(error);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Batch execute with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item
 * @param {number} [concurrency=5] - Maximum concurrent executions
 * @returns {Promise<Array>} - Results array
 */
export async function batchExecute(items, fn, concurrency = 5) {
  const results = [];
  const executing = new Set();

  for (const [index, item] of items.entries()) {
    const promise = Promise.resolve().then(() => fn(item, index));
    results.push(promise);
    executing.add(promise);

    const clean = () => executing.delete(promise);
    promise.then(clean, clean);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

export default { retry, sleep, withTimeout, batchExecute, createRetry };
