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
  }
}

module.exports = request