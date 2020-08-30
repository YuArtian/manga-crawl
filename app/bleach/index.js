const cheerio = require('cheerio')
const axios = require("axios");
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

/* 获取图片 */
const request_img = async img_url =>
  axios({
    url: img_url,
    method: "get",
    responseType: "stream",
  });

/* 从 html 中获取图片列表 */
const get_img_list = html => {
  try {
    const $ = cheerio.load(html)
    const img_data_html = $('body > script').html()
    const img_data_base = img_data_html.match(/'(\S*)';/)[0]
    const img_data_code = new Buffer.from(img_data_base, 'base64').toString()
    const img_data_list = JSON.parse(img_data_code)
    const vg_r_data = $('.vg-r-data')
    const img_host = vg_r_data.data('host');
    const img_pre = vg_r_data.data('img_pre');

    return img_data_list.map(i => `${img_host}${img_pre}${i.img}`)
  } catch (error) {
    console.log('ERROR:: get_img_list', error)
  }
}

/* 写入文件 */
const writeFile = (res, section, fileName, index) => {
  return new Promise((resolve, reject) => {
    const distFileName = path.resolve(__dirname, `../dist/bleach/${section}/${fileName}`)
    const stream = fs.createWriteStream(distFileName, { encoding: 'binary' });
    res.data.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

(async function(){
  try {
    for (let i = 0; i < html_list.length; i++) {
      const html_url = html_list[i];
      await fs.promises.mkdir(path.resolve(__dirname, `../../dist/bleach/第${i+1}回`), { recursive: true })
      // 获取 HTML
      // url: 'https://www.manhuadb.com/manhua/141/5558_92149_p1.html',
      const html = await request('GET', html_url)
      const img_list = get_img_list_info(html)

    }



    const length = img_data_list.length
    for (let index = 0; index < length; index++) {
      const { img, p } = img_data_list[index];
      console.log('`${img_host}${img_pre}${img_name}`',`${img_host}${img_pre}${img}`)
      const res = await request_img(`${img_host}${img_pre}${img}`)
      await writeFile(res, 1, `${p}.jpg`)
    }

  } catch (error) {
    console.log('ERROR:: main',error)
  }
})()
