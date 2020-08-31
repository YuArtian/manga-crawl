const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs')
const request = require('../request')

/* 读取配置 */
// https://www.manhuadb.com/manhua/141
const book = require('./datasource.js')
// 单行本
const book_1_list = book.hasPart[0].hasPart.map(i => i.url)
// 连载
const book_2_list = book.hasPart[1].hasPart.map(i => i.url)
// 番外
const book_3_list = book.hasPart[2].hasPart.map(i => i.url)

const html_list = [...book_1_list, ...book_2_list, ...book_3_list]

/* 从 html 中获取图片url列表 */
const get_img_url_list = html => {
  try {
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
    console.log('ERROR:: get_img_list\r\n', error)
  }
}

/* 写入文件 */
const writeFile = (img_stream, html_name, img_name) => {
  return new Promise((resolve, reject) => {
    const distFileName = path.resolve(__dirname, `../../dist/bleach/${html_name}/${img_name}.jpg`)
    const stream = fs.createWriteStream(distFileName, { encoding: 'binary' });
    img_stream.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

// main
(async function(){
  try {
    console.log('=== main start ===\r\n')
    // 根据 html_list 获取 html 文件
    const html_length = html_list.length
    for (let html_i = 0; html_i < 1; html_i++) {
      const html_url = html_list[html_i];
      const html_name = `第${html_i + 1}回`
      // 创建章节目录
      console.log(`创建章节目录:: ${html_name}\r\n`)
      await fs.promises.mkdir(path.resolve(__dirname, `../../dist/bleach/${html_name}`), { recursive: true })
      // 获取 HTML
      console.log(`HTML:: 开始下载 -${html_name}\r\n`)
      // url: 'https://www.manhuadb.com/manhua/141/5558_92149_p1.html',
      const html = await request('GET', html_url)
      console.log(`HTML:: 完成下载 -${html_name}\r\n`)
      // 每一章的图片列表
      const img_url_list = get_img_url_list(html)
      // 依次下载图片并保存本地
      const img_length = img_url_list.length
      // 根据 img_url_list 获取并保存图片
      console.log('')
      for (let img_i = 0; img_i < 10; img_i++) {
        const img_url = img_url_list[img_i];
        const img_name = img_i + 1
        // 下载图片
        console.log(`IMG:: 开始下载 -${html_name} 第${img_name}\r\n${img_url}\r\n`)
        const img_stream = await request('GET', img_url, { responseType: "stream" })
        console.log(`IMG:: 完成下载 -${html_name} 第${img_name}\r\n`)
        // 写入本地
        await writeFile(img_stream, html_name, img_name)
        console.log(`${html_name}:: 写入${img_name}图片成功`)
      }
    }
  } catch (error) {
    console.log('ERROR:: main\r\n',error)
  }
})()
