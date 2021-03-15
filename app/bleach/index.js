const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')
const request = require('../request')
const ERROR_FILE = path.join(__dirname, './error.json')
const ERROR_LIST = []
const ERROR_SECTION = 'ERROR_SECTION'
const ERROR_CHAPTER = 'ERROR_CHAPTER'

/* 读取配置 */
// https://www.manhuadb.com/manhua/141
const book = require('./datasource.js')
// 单行本
const book_1_list = book.hasPart[0].hasPart.map(i => i.url)
// 连载
const book_2_list = book.hasPart[1].hasPart.map(i => i.url)
// 番外
const book_3_list = book.hasPart[2].hasPart.map(i => i.url)
// 总章数列表
const chapter_list = [...book_1_list, ...book_2_list, ...book_3_list]

const CHAPTER_TOTAL = chapter_list.length
let CHAPTER_DONE_NUMBER = 0


/* 从 html 中获取图片url列表 */
const get_img_url_list = async chapter_url => {
  try {
    const html = await request('GET', chapter_url)
    // 加载 html
    const $ = cheerio.load(html)
    // 图片信息
    const vg_r_data = $('.vg-r-data')
    const img_host = vg_r_data.data('host');
    const img_pre = vg_r_data.data('img_pre');
    // 图片列表
    const img_list_html = $('body > script').html()
    const img_list_base64 = img_list_html.match(/'(\S*)';/)[0]
    const img_list = JSON.parse(new Buffer.from(img_list_base64, 'base64').toString())
    // 图片 url 列表
    return img_list.map(i => `${img_host}${img_pre}${i.img}`)
  } catch (error) {
    console.error('ERROR:: get_img_list\r\n', error)
    return Promise.reject({code: ERROR_CHAPTER, url: chapter_url})
  }
}

/* 写入图片 */
const write_file = (dist_file_name, section_stream) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`开始写入：${dist_file_name}`)
      const stream = fs.createWriteStream(dist_file_name, { encoding: 'binary' });
      section_stream.pipe(stream);
      stream.on('close', () => {
        console.log('stream close')
        resolve()
      })
      stream.on("error", (error) => {
        console.error('ERROR:: STREAM error', error)
        reject()
      });
    } catch (error) {
      console.error('ERROR:: write_file error', error)
      reject()
    }
  });
};

/* 记录出错文件 */
const record_error = ({code, url, chapter_number, section_number}) => {
  if (code === ERROR_CHAPTER) {
    ERROR_LIST[chapter_number] = url
  }
  if (code === ERROR_SECTION) {
    const chapter_current = ERROR_LIST[chapter_number]
    !chapter_current && (ERROR_LIST[chapter_number] = [])
    if(typeof chapter_current === 'string') return
    chapter_current[section_number] = url
  }
}

/* 写入章节图片 */
const save_section = async (chapter_name, section_url, section_number) => {
  try {
    const dist_file_name = path.resolve(__dirname, `../../dist/bleach/${chapter_name}/${section_number}.jpg`)
    // 已存在图片则跳过
    if (fs.existsSync(dist_file_name)) return true
    // 下载图片
    const section_stream = await request('GET', section_url, { responseType: "stream" })
    // 节获取 & 写入
    await write_file(dist_file_name, section_stream)
  } catch (error) {
    console.error('ERROR:: save_section', error)
    return Promise.reject({code: ERROR_SECTION, url: section_url, section_number})
  }
}

// main
(async function(){
    // 根据 chapter_list 获取 html 文件
    const chapter_length = chapter_list.length
    console.log(`CHAPTER:: 共${chapter_length} 回`)
    for (let chapter_index = 0; chapter_index < chapter_length; chapter_index++) {
      const chapter_url = chapter_list[chapter_index];
      const chapter_number = chapter_index + 1
      const chapter_name = `第${chapter_number}回`
      try {
        // 创建章节目录
        await fs.promises.mkdir(path.resolve(__dirname, `../../dist/bleach/${chapter_name}`), { recursive: true })
        // 获取节列表
        const section_url_list = await get_img_url_list(chapter_url)
        // 依次下载图片并保存本地
        const section_length = section_url_list.length
        // 根据 section_url_list 获取并保存图片
        console.log(`开始下载${chapter_name}[section_length:${section_length}]\r\n`)
        for (let section_index = 0; section_index < section_length; section_index++) {
          try {
            const section_url = section_url_list[section_index];
            const section_number = section_index + 1
            // 下载章节
            console.log(`${chapter_name}:: 开始下载${section_number}图片\r\n`)
            const is_exist = await save_section(chapter_name, section_url, section_number)
            // 记录进度
            CURRENT_SECTION_INDEX = section_index
            if(is_exist) continue
            console.log(`${chapter_name}:: 写入${section_number}图片成功\r\n`)
          } catch (error) {
            console.error('ERROR:: SECTION', error)
            error.code && record_error({...error, chapter_name})
            continue
          }
        }
        console.log(`${chapter_name}下载完成\r\n`)
        // 记录进度
        CHAPTER_DONE_NUMBER = chapter_number
      } catch (error) {
        console.error(`ERROR:: 第${chapter_name}回处理失败`, error)
        error.code && record_error({...error, chapter_name})
        continue
      }
    }
    if (ERROR_LIST.length > 0) {
      fs.writeFileSync(ERROR_FILE, ERROR_LIST)
    }
})()

process.on('exit', (code) => {
  console.log('进程 exit 事件的退出码: ', code);
  if(CHAPTER_DONE_NUMBER !== CHAPTER_TOTAL) {
    console.error('下载未完成 请重新运行')
    return
  }
  console.log('🎉🎉🎉 全部下载完成 🎉🎉🎉')
});
