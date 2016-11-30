var rp = require('request-promise-native')

function imageOfTheDay() {
    let url = 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US'
    return rp({uri: url, json: true}).then((info) => {
        let imageUrl = 'https://www.bing.com' + info.images[0].url
        let altText = info.images[0].copyright
        return rp({uri: imageUrl, encoding: null}).then((data) => {
            return {
                imageUrl: imageUrl, 
                imageData: data, 
                altText: altText
            }
        })
    })
}

exports.imageOfTheDay = imageOfTheDay