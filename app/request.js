const axios = require('axios')

const request = async (type='GET', url, configs={}) => {
  try {
    const res = await axios({
      url,
      method: type,
      timeout: 6000,
      ...configs
    })
    return res.data
  } catch (error) {
    console.log('ERROR::request', error)
    return Promise.reject(error)
  }
}

module.exports = request