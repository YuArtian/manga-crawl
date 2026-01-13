/**
 * File operation utilities with atomic writes
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>}
 */
export async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size
 * @param {string} filePath - File path
 * @returns {Promise<number>} - File size in bytes, -1 if not exists
 */
export async function getFileSize(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch {
    return -1;
  }
}

/**
 * Read JSON file
 * @param {string} filePath - File path
 * @param {any} defaultValue - Default value if file not exists
 * @returns {Promise<any>}
 */
export async function readJson(filePath, defaultValue = null) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Write JSON file atomically (write to tmp, then rename)
 * @param {string} filePath - File path
 * @param {any} data - Data to write
 */
export async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmpPath = `${filePath}.${Date.now()}.tmp`;
  const content = JSON.stringify(data, null, 2);

  try {
    await fs.promises.writeFile(tmpPath, content, 'utf-8');
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    // Clean up tmp file if rename fails
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Write binary file atomically
 * @param {string} filePath - File path
 * @param {Buffer|Uint8Array} data - Binary data
 */
export async function writeBinaryAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmpPath = `${filePath}.${Date.now()}.tmp`;

  try {
    await fs.promises.writeFile(tmpPath, data);
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Write stream to file atomically
 * @param {string} filePath - File path
 * @param {ReadableStream} stream - Readable stream
 */
export async function writeStreamAtomic(filePath, stream) {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmpPath = `${filePath}.${Date.now()}.tmp`;

  try {
    const writeStream = fs.createWriteStream(tmpPath);
    await pipeline(stream, writeStream);
    await fs.promises.rename(tmpPath, filePath);
  } catch (error) {
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Delete file if exists
 * @param {string} filePath - File path
 */
export async function deleteFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * List files in directory
 * @param {string} dirPath - Directory path
 * @param {string} [pattern] - Optional glob pattern (simple extension filter)
 * @returns {Promise<string[]>} - Array of file paths
 */
export async function listFiles(dirPath, pattern = null) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let files = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(dirPath, entry.name));

    if (pattern) {
      const ext = pattern.startsWith('*.') ? pattern.slice(1) : pattern;
      files = files.filter(file => file.endsWith(ext));
    }

    return files;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * List directories in directory
 * @param {string} dirPath - Directory path
 * @returns {Promise<string[]>} - Array of directory paths
 */
export async function listDirs(dirPath) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(dirPath, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Generate MD5 hash of file
 * @param {string} filePath - File path
 * @returns {Promise<string>} - MD5 hash
 */
export async function getFileHash(filePath) {
  const hash = crypto.createHash('md5');
  const stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Sanitize filename (remove invalid characters)
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Get available disk space (Unix only)
 * @param {string} dirPath - Directory path
 * @returns {Promise<number>} - Available space in bytes
 */
export async function getAvailableSpace(dirPath) {
  // This is a simplified check, works on Unix systems
  try {
    const stats = await fs.promises.statfs(dirPath);
    return stats.bavail * stats.bsize;
  } catch {
    return Infinity; // Return Infinity if we can't check
  }
}
