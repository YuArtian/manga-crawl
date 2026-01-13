/**
 * Parser for manhuagui.com website
 * Handles both mobile (m.manhuagui.com) and desktop versions
 */

/**
 * Parse chapter URL to extract comic and chapter IDs
 * @param {string} url - Chapter URL
 * @returns {Object|null} Parsed info or null if invalid
 */
export function parseChapterUrl(url) {
  // Mobile URL format: https://m.manhuagui.com/comic/{comicId}/{chapterId}.html
  // Desktop URL format: https://www.manhuagui.com/comic/{comicId}/{chapterId}.html
  const match = url.match(/manhuagui\.com\/comic\/(\d+)\/(\d+)\.html/);

  if (match) {
    return {
      comicId: match[1],
      chapterId: match[2],
      isMobile: url.includes('m.manhuagui.com'),
    };
  }

  return null;
}

/**
 * Parse comic URL to extract comic ID
 * @param {string} url - Comic URL
 * @returns {Object|null} Parsed info or null if invalid
 */
export function parseComicUrl(url) {
  // Format: https://m.manhuagui.com/comic/{comicId}/
  const match = url.match(/manhuagui\.com\/comic\/(\d+)\/?$/);

  if (match) {
    return {
      comicId: match[1],
      isMobile: url.includes('m.manhuagui.com'),
    };
  }

  return null;
}

/**
 * Decode the img_data variable from page source
 * The website uses LZString compression + base64 encoding
 * @param {string} encoded - Encoded image data string
 * @returns {Array|null} Decoded image list
 */
export function decodeImageData(encoded) {
  try {
    // The data is wrapped in single quotes and ends with semicolon
    // Format: var img_data = 'base64string';
    let data = encoded;

    // Remove quotes and semicolon if present
    if (data.startsWith("'") || data.startsWith('"')) {
      data = data.slice(1);
    }
    if (data.endsWith("';") || data.endsWith('";')) {
      data = data.slice(0, -2);
    }
    if (data.endsWith("'") || data.endsWith('"')) {
      data = data.slice(0, -1);
    }

    // Decode base64
    const decoded = Buffer.from(data, 'base64').toString('utf-8');

    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode image data:', error.message);
    return null;
  }
}

/**
 * Extract image data from HTML source
 * @param {string} html - Page HTML source
 * @returns {Object|null} Extracted data
 */
export function extractImageDataFromHtml(html) {
  try {
    // Extract img_data variable
    const imgDataMatch = html.match(/var\s+img_data\s*=\s*['"]([^'"]+)['"]/);
    if (!imgDataMatch) {
      return null;
    }

    const imageList = decodeImageData(imgDataMatch[1]);
    if (!imageList) {
      return null;
    }

    // Extract host and path prefix from data attributes
    // <div class="vg-r-data" data-host="..." data-img_pre="...">
    const hostMatch = html.match(/data-host=["']([^"']+)["']/);
    const imgPreMatch = html.match(/data-img_pre=["']([^"']+)["']/);
    const totalMatch = html.match(/data-total=["'](\d+)["']/);

    const host = hostMatch ? hostMatch[1] : '';
    const imgPre = imgPreMatch ? imgPreMatch[1] : '';
    const total = totalMatch ? parseInt(totalMatch[1], 10) : imageList.length;

    return {
      host,
      imgPre,
      total,
      images: imageList,
    };
  } catch (error) {
    console.error('Failed to extract image data:', error.message);
    return null;
  }
}

/**
 * Build full image URLs from extracted data
 * @param {Object} data - Extracted image data
 * @param {boolean} [preferWebp=true] - Prefer webp format
 * @returns {string[]} Array of full image URLs
 */
export function buildImageUrls(data, preferWebp = true) {
  if (!data || !data.images) {
    return [];
  }

  const { host, imgPre, images } = data;

  return images.map(img => {
    const filename = preferWebp && img.img_webp ? img.img_webp : img.img;
    return `${host}${imgPre}${filename}`;
  });
}

/**
 * Extract chapter list from comic page HTML
 * @param {string} html - Comic page HTML
 * @returns {Array} Array of chapter info objects
 */
export function extractChapterList(html) {
  const chapters = [];

  // Match chapter links in the chapter list
  // Format: <a href="/comic/30252/405318.html">第01回</a>
  const regex = /<a[^>]*href=["']\/comic\/\d+\/(\d+)\.html["'][^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    chapters.push({
      chapterId: match[1],
      title: match[2].trim(),
    });
  }

  return chapters;
}

/**
 * Extract comic info from page HTML
 * @param {string} html - Page HTML
 * @returns {Object|null} Comic info
 */
export function extractComicInfo(html) {
  try {
    // Try to extract from JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd['@type'] === 'ComicSeries' || jsonLd.name) {
        return {
          name: jsonLd.name,
          description: jsonLd.description,
        };
      }
    }

    // Fallback: extract from title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1].split('-')[0].trim();
      return { name: title };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get required headers for image requests
 * @param {string} chapterUrl - Chapter URL for referer
 * @returns {Object} Headers object
 */
export function getImageRequestHeaders(chapterUrl) {
  return {
    'Referer': chapterUrl,
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
  };
}

/**
 * Convert desktop URL to mobile URL
 * @param {string} url - URL to convert
 * @returns {string} Mobile URL
 */
export function toMobileUrl(url) {
  return url.replace('www.manhuagui.com', 'm.manhuagui.com');
}

/**
 * Convert mobile URL to desktop URL
 * @param {string} url - URL to convert
 * @returns {string} Desktop URL
 */
export function toDesktopUrl(url) {
  return url.replace('m.manhuagui.com', 'www.manhuagui.com');
}

/**
 * Check if URL is from manhuagui
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isManhuaguiUrl(url) {
  return /manhuagui\.com/.test(url);
}

export default {
  parseChapterUrl,
  parseComicUrl,
  decodeImageData,
  extractImageDataFromHtml,
  buildImageUrls,
  extractChapterList,
  extractComicInfo,
  getImageRequestHeaders,
  toMobileUrl,
  toDesktopUrl,
  isManhuaguiUrl,
};
