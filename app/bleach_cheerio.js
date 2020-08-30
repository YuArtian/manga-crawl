const cheerio = require('cheerio')
const axios = require("axios");
const path = require('path')
const fs = require('fs')

/* 获取图片 */
const request_img = (imgUrl) =>
  axios({
    url: imgUrl,
    method: "get",
    responseType: "stream",
  });
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
    const html = await axios({
      method: 'get',
      url: 'https://www.manhuadb.com/manhua/141/5558_92149_p1.html',
    })
    const $ = cheerio.load(html.data)
    const img_data_html = $('body > script').html()
    const img_data_base = img_data_html.match(/'(\S*)';/)[0]
    const img_data_code = new Buffer.from(img_data_base, 'base64').toString()
    const img_data_list = JSON.parse(img_data_code)

    const vg_r_data = $('.vg-r-data')
    const img_host = vg_r_data.data('host');
    const img_pre = vg_r_data.data('img_pre');
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
