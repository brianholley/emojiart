var HttpUtils = require('./httputils')

function imageOfTheDay(apiKey, callback) {
    let url = 'https://api.nasa.gov/planetary/apod?api_key=' + apiKey
    HttpUtils.getJson(
        url, 
        (image) => {
            let imageUrl = image.url
            let altText = image.title
            HttpUtils.getBinary(imageUrl, (data) => {
                callback(imageUrl, data, altText)
            })
    })
}

exports.imageOfTheDay = imageOfTheDay