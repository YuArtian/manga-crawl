/**
 * Library manager for manga metadata stored in index.json
 * Handles mapping between semantic names and website IDs
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default library path
const DEFAULT_LIBRARY_PATH = path.resolve(
  __dirname,
  "../../doc/manhuigui/index.json"
);

/**
 * Library manager class
 */
class Library {
  constructor(libraryPath = DEFAULT_LIBRARY_PATH) {
    this.libraryPath = libraryPath;
    this.data = null;
  }

  /**
   * Load library data from file
   * @returns {Promise<Object>} Library data
   */
  async load() {
    if (this.data) {
      return this.data;
    }

    try {
      const content = await fs.readFile(this.libraryPath, "utf-8");
      this.data = JSON.parse(content);
      return this.data;
    } catch (error) {
      // Return default structure if file doesn't exist
      this.data = {
        site: "https://m.manhuagui.com",
        lib: [],
      };
      return this.data;
    }
  }

  /**
   * Save library data to file
   * @returns {Promise<void>}
   */
  async save() {
    if (!this.data) {
      return;
    }

    const dir = path.dirname(this.libraryPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      this.libraryPath,
      JSON.stringify(this.data, null, 2),
      "utf-8"
    );
  }

  /**
   * Get manga by semantic name
   * @param {string} name - Semantic name (e.g., "chainsawman")
   * @returns {Promise<Object|null>} Manga config or null
   */
  async getMangaByName(name) {
    const data = await this.load();
    return data.lib.find((c) => c.name === name) || null;
  }

  /**
   * Get manga by website ID
   * @param {string} id - Website manga ID (e.g., "30252")
   * @returns {Promise<Object|null>} Manga config or null
   */
  async getMangaById(id) {
    const data = await this.load();
    return data.lib.find((c) => c.id === id) || null;
  }

  /**
   * Add or update manga in library
   * @param {Object} manga - Manga config
   * @param {string} manga.name - Semantic name
   * @param {string} manga.id - Website ID
   * @param {string} [manga.url] - URL template
   * @param {Array} [manga.chapters] - Chapter list
   * @returns {Promise<void>}
   */
  async upsertManga(manga) {
    const data = await this.load();
    const index = data.lib.findIndex((c) => c.name === manga.name);

    const defaultUrl = `${data.site}/comic/$id/$chapterId.html#p=$page`;

    if (index >= 0) {
      // Update existing
      data.lib[index] = {
        ...data.lib[index],
        ...manga,
        url: manga.url || data.lib[index].url || defaultUrl,
      };
    } else {
      // Add new
      data.lib.push({
        url: defaultUrl,
        chapters: [],
        ...manga,
      });
    }

    await this.save();
  }

  /**
   * Update chapters for a manga
   * @param {string} name - Manga name
   * @param {Array} chapters - Chapter list from parser
   * @returns {Promise<void>}
   */
  async updateChapters(name, chapters) {
    const manga = await this.getMangaByName(name);
    if (!manga) {
      throw new Error(`Manga not found: ${name}`);
    }

    // Store chapter mapping: { chapterId, title, type, number, index }
    manga.chapterMap = chapters.map((ch, idx) => ({
      chapterId: ch.chapterId,
      title: ch.title,
      type: ch.type,
      number: ch.number,
      index: idx + 1, // 1-based index for folder naming
    }));

    // Also keep simple chapters array for backward compatibility
    manga.chapters = chapters.map((ch) => ch.chapterId);

    await this.save();
  }

  /**
   * Get chapter index (for folder naming)
   * @param {string} name - Manga name
   * @param {string} chapterId - Chapter ID
   * @returns {Promise<number|null>} 1-based index or null
   */
  async getChapterIndex(name, chapterId) {
    const manga = await this.getMangaByName(name);
    if (!manga || !manga.chapterMap) {
      return null;
    }

    const chapter = manga.chapterMap.find((ch) => ch.chapterId === chapterId);
    return chapter ? chapter.index : null;
  }

  /**
   * Get chapter info by ID
   * @param {string} name - Manga name
   * @param {string} chapterId - Chapter ID
   * @returns {Promise<Object|null>} Chapter info or null
   */
  async getChapterInfo(name, chapterId) {
    const manga = await this.getMangaByName(name);
    if (!manga || !manga.chapterMap) {
      return null;
    }

    return manga.chapterMap.find((ch) => ch.chapterId === chapterId) || null;
  }

  /**
   * Get all manga in library
   * @returns {Promise<Array>} List of manga
   */
  async listManga() {
    const data = await this.load();
    return data.lib;
  }

  /**
   * Build chapter URL
   * @param {string} name - Manga name
   * @param {string} chapterId - Chapter ID
   * @param {number} [page=1] - Page number
   * @returns {Promise<string|null>} Full URL or null
   */
  async buildChapterUrl(name, chapterId, page = 1) {
    const manga = await this.getMangaByName(name);
    if (!manga) {
      return null;
    }

    const data = await this.load();
    const baseUrl = manga.url || `${data.site}/comic/$id/$chapterId.html#p=$page`;

    return baseUrl
      .replace("$id", manga.id)
      .replace("$chapterId", chapterId)
      .replace("$page", page.toString());
  }

  /**
   * Get semantic folder name for chapter
   * @param {string} name - Manga name
   * @param {string} chapterId - Chapter ID
   * @returns {Promise<string>} Folder name (e.g., "chapter_0001")
   */
  async getChapterFolderName(name, chapterId) {
    const index = await this.getChapterIndex(name, chapterId);
    if (index !== null) {
      return `chapter_${String(index).padStart(4, "0")}`;
    }
    // Fallback to chapter ID if not in library
    return `chapter_${chapterId}`;
  }
}

// Singleton instance
let libraryInstance = null;

/**
 * Get library instance
 * @param {string} [libraryPath] - Custom library path
 * @returns {Library} Library instance
 */
export function getLibrary(libraryPath) {
  if (!libraryInstance || libraryPath) {
    libraryInstance = new Library(libraryPath);
  }
  return libraryInstance;
}

export { Library };
export default getLibrary;
