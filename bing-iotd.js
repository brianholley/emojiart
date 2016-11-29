var HttpUtils = require('./httputils')

function imageOfTheDay(callback) {
    HttpUtils.getJson(
        'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US', 
        (image) => {
            let imageUrl = 'https://www.bing.com' + image.images[0].url
            let altText = image.images[0].copyright
            HttpUtils.getBinary(imageUrl, (data) => {
                callback(imageUrl, data, altText)
            })
    })
}

exports.imageOfTheDay = imageOfTheDay