const puppeteer = require("puppeteer");
const axios = require("axios");
const fs = require("fs");
const url = require('url')
const path = require('path')
const webp = require('webp-converter')

const BASE_PATH = './dist/bleach'
const requestImg = (imgUrl) =>
  axios({
    url: imgUrl,
    method: "get",
    responseType: "stream",
    headers: { referer: "https://www.manhuagui.com/comic/4682/39738.html" },
  });

// 创建文件夹
const createDir = async (section) => {
  try {
    await fs.promises.mkdir(path.resolve(__dirname, `../dist/bleach/${section}`), { recursive: true })
  } catch (error) {
    console.log('ERROR::创建文件目录错误(createDir)\r\n',error)
  }
}

//启动 puppeteer
const startPuppeteer = async () => {
  try {
    //是否运行在浏览器 headless 模式，true为不打开浏览器执行，默认为true
    // const browser = await puppeteer.launch({ headless: false });
    const browser = await puppeteer.launch();
    return browser;
  } catch (error) {
    console.log("ERROR::Puppeteer启动错误(startPuppeteer)\r\n", error);
  }
};
//获取图片URL
const getImgURL = async (browser, pageIndex) => {
  try {
    const page = await browser.newPage();
    // 加载首页
    await page.goto(
      // `https://www.manhuagui.com/comic/4682/39738.html#p=${pageIndex}`,
      `https://www.manhuadb.com/manhua/141/5558_92149_p1.html`,
      { waitUntil: "networkidle2" }
    );
    // 获取图片列表
    const imgList = await page.$eval("body",(elements) => {
      console.log('elements',elements)
      return elements
    })
    console.log('imgList',imgList)
    //img-fluid
    //mangaFile
    // const imgUrl = await page.$eval("img.img-fluid", (elements) => {
    //   return elements.src;
    // });
    // const fileName = path.basename(url.parse(imgUrl).pathname)
    await page.close()
    //https://i.hamreus.com/ps3/s/Bleach/02/00-02.jpg.webp?e=1597680000&m=knoWlD1IXHX-mQtJ0f8wsg
    // return [imgUrl, fileName];
  } catch (error) {
    console.log("ERROR::获取图片URL失败(getImgURL)\r\n", error);
  }
};
//写入文件
const writeFile = (res, section, fileName, index) => {
  return new Promise((resolve, reject) => {
    // const distFileName = `${BASE_PATH}/${section}/${index}.png`
    const distFileName = path.resolve(__dirname, `../dist/bleach/${section}/${fileName}`)
    const stream = fs.createWriteStream(distFileName, {encoding: 'binary'});
    res.data.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
    /* const extArr = fileName.split('.')
    const result = webp.dwebp(distFileName,path.resolve(__dirname, `../dist/bleach/${section}/${index}.png`),"-o");
    result.then((response) => {
      console.log(response);
    }); */
  });
};
//自执行下载主程序
(async function () {
  try {
    console.log('开始下载~')
    await createDir(1)
    console.log('创建目录成功')
    //启动
    console.log('开始:启动浏览器')
    const browser = await startPuppeteer();
    console.log('成功:浏览器已启动')
    await getImgURL(browser, 1);
    //188
    /* for (let index = 1; index <= 1; index++) {
      //获取图片url
      console.log(`开始::获取第${index}张URL`)
      const [imgUrl, fileName] = await getImgURL(browser, index);

      console.log(`成功::获取第${index}张URL`)
      if (!imgUrl) {
        console.log(`跳过::获取第${index}张URL失败，跳过`)
        continue
      }
      //获取图片二进制
      console.log(`开始::获取第${index}张图片`)
      const res = await requestImg(imgUrl);
      console.log(`成功::获取第${index}张图片`)
      //写入文件
      console.log(`开始:写入第${index}张图片`)
      await writeFile(res, 1, fileName, index);
      console.log(`成功:写入第${index}张图片`)
      console.log(`=================${index}================`)
    } */
    //关闭浏览器
    await browser.close()
    console.log('退出浏览器')
  } catch (error) {
    console.log("ERROR::主进程错误\r\n", error);
  }
})();
