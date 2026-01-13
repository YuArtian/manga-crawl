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
 * Unpack packed JavaScript code (p,a,c,k,e,d format)
 * @param {string} packed - Packed JS code
 * @returns {string|null} Unpacked code
 */
export function unpackJs(packed) {
  try {
    // Extract the packed function parameters
    // Format: eval(function(p,a,c,k,e,d){...}('packed_string','split_char',count,keywords,...))
    const match = packed.match(/\}\('([^']+)',(\d+),(\d+),'([^']+)'\.split\('\|'\)/);
    if (!match) {
      return null;
    }

    const p = match[1];
    const a = parseInt(match[2], 10);
    const c = parseInt(match[3], 10);
    const k = match[4].split('|');

    // Base conversion function
    const e = (c) => {
      return (c < a ? '' : e(parseInt(c / a))) + 
        ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
    };

    // Replace placeholders with actual values
    let unpacked = p;
    while (c--) {
      if (k[c]) {
        unpacked = unpacked.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }

    return unpacked;
  } catch (error) {
    console.error('Failed to unpack JS:', error.message);
    return null;
  }
}

/**
 * Extract SMH.reader config from unpacked JS
 * @param {string} unpacked - Unpacked JS code
 * @returns {Object|null} Reader config
 */
export function extractReaderConfig(unpacked) {
  try {
    // Match SMH.reader({...}) or SMH.imgData({...})
    const match = unpacked.match(/SMH\.(?:reader|imgData)\((\{[\s\S]*?\})\)/);
    if (!match) {
      return null;
    }

    // Parse the config object (it's valid JSON-like)
    const configStr = match[1];
    
    // Use Function to safely evaluate the object
    const config = new Function('return ' + configStr)();
    return config;
  } catch (error) {
    console.error('Failed to extract reader config:', error.message);
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
    // Method 1: Try to extract packed JS and unpack it
    const packedMatch = html.match(/window\[.*?eval.*?\]\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}(\('[\s\S]*?\.split\('\|'\),\d+,\{\}\)\))/);
    
    if (packedMatch) {
      const packedCode = packedMatch[1];
      const unpacked = unpackJs(packedCode);
      
      if (unpacked) {
        const config = extractReaderConfig(unpacked);
        
        if (config && config.images) {
          // Build proper image data structure
          const host = config.host || 'i';
          const sl = config.sl || {};
          
          // Build query string from sl parameters
          const slParams = Object.entries(sl).map(([k, v]) => `${k}=${v}`).join('&');
          const suffix = slParams ? `?${slParams}` : '';
          
          return {
            host: `https://${host}.hamreus.com`,
            imgPre: '',
            total: config.images.length,
            images: config.images.map(img => ({
              img: img + suffix,
              img_webp: img.replace(/\.(jpg|png)$/i, '.webp') + suffix,
            })),
            raw: config, // Keep raw config for debugging
          };
        }
      }
    }

    // Method 2: Try old img_data format (fallback)
    const imgDataMatch = html.match(/var\s+img_data\s*=\s*['"]([^'"]+)['"]/);
    if (imgDataMatch) {
      const imageList = decodeImageData(imgDataMatch[1]);
      if (imageList) {
        const hostMatch = html.match(/data-host=["']([^"']+)["']/);
        const imgPreMatch = html.match(/data-img_pre=["']([^"']+)["']/);
        const totalMatch = html.match(/data-total=["'](\d+)["']/);

        return {
          host: hostMatch ? hostMatch[1] : '',
          imgPre: imgPreMatch ? imgPreMatch[1] : '',
          total: totalMatch ? parseInt(totalMatch[1], 10) : imageList.length,
          images: imageList,
        };
      }
    }

    return null;
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
 * Determine chapter type from title
 * @param {string} title - Chapter title
 * @returns {string} Chapter type: 'chapter' | 'volume' | 'appendix' | 'extra' | 'other'
 */
export function getChapterType(title) {
  // Volume: 第XX卷
  if (/^第\d+卷$/.test(title)) {
    return 'volume';
  }
  // Appendix: XX卷附录
  if (/附录/.test(title)) {
    return 'appendix';
  }
  // Extra: 番外篇
  if (/番外/.test(title)) {
    return 'extra';
  }
  // Chapter: 第XX话, 第XX回
  if (/^第\d+[话回]/.test(title) || /^第\d+话/.test(title)) {
    return 'chapter';
  }
  // Other special content
  return 'other';
}

/**
 * Extract chapter number from title
 * @param {string} title - Chapter title
 * @returns {number|null} Chapter number or null
 */
export function extractChapterNumber(title) {
  // Match: 第XX话, 第XX回, 第XX卷
  const match = title.match(/第(\d+)[话回卷]/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Extract chapter list from comic page HTML
 * @param {string} html - Comic page HTML
 * @returns {Array} Array of chapter info objects with chapterId, title, type, number
 */
export function extractChapterList(html) {
  const chapters = [];

  // Match chapter links in the chapter list
  // Format: <a href="/comic/30252/405318.html"><b>第01回</b></a>
  // Or: <a href="https://m.manhuagui.com/comic/30252/405318.html"><b>第01回</b></a>
  const regex = /<a[^>]*href=["'](?:https?:\/\/[^/]+)?\/comic\/\d+\/(\d+)\.html["'][^>]*><b>([^<]+)<\/b>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const chapterId = match[1];
    const title = match[2].trim();
    const type = getChapterType(title);
    const number = extractChapterNumber(title);

    chapters.push({
      chapterId,
      title,
      type,
      number,
    });
  }

  return chapters;
}

/**
 * Filter chapters by type
 * @param {Array} chapters - Chapter list
 * @param {Object} options - Filter options
 * @param {boolean} [options.includeVolumes=false] - Include volume chapters
 * @param {boolean} [options.includeAppendix=true] - Include appendix chapters
 * @param {boolean} [options.includeExtra=true] - Include extra chapters
 * @param {boolean} [options.includeOther=true] - Include other chapters
 * @returns {Array} Filtered chapter list
 */
export function filterChapters(chapters, options = {}) {
  const {
    includeVolumes = false,
    includeAppendix = true,
    includeExtra = true,
    includeOther = true,
  } = options;

  return chapters.filter(ch => {
    if (ch.type === 'volume' && !includeVolumes) return false;
    if (ch.type === 'appendix' && !includeAppendix) return false;
    if (ch.type === 'extra' && !includeExtra) return false;
    if (ch.type === 'other' && !includeOther) return false;
    return true;
  });
}

/**
 * Sort chapters by number (ascending order, oldest first)
 * @param {Array} chapters - Chapter list
 * @returns {Array} Sorted chapter list
 */
export function sortChapters(chapters) {
  return [...chapters].sort((a, b) => {
    // Chapters with numbers come first, sorted by number
    if (a.number !== null && b.number !== null) {
      return a.number - b.number;
    }
    // Chapters with numbers before those without
    if (a.number !== null) return -1;
    if (b.number !== null) return 1;
    // Fall back to title comparison
    return a.title.localeCompare(b.title, 'zh-CN');
  });
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
  getChapterType,
  extractChapterNumber,
  extractChapterList,
  filterChapters,
  sortChapters,
  extractComicInfo,
  getImageRequestHeaders,
  toMobileUrl,
  toDesktopUrl,
  isManhuaguiUrl,
};
