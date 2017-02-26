var rp = require('request-promise-native')

function imageOfTheDay() {
    let url = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'
    return rp({uri: url, json: true}).then((info) => {
        return {
            imageUrl: 'https://www.bing.com' + info.images[0].url,
            altText: info.images[0].copyright
        }
    })
}

exports.imageOfTheDay = imageOfTheDay