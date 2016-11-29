var HttpUtils = require('./httputils')

function imageOfTheDay(apiKey, callback) {
    let url = 'https://api.nasa.gov/planetary/apod?api_key=' + apiKey
    console.log(apiKey)
    console.log(url)
    HttpUtils.getJson(
        url, 
        (image) => {
            console.log(image)
            let imageUrl = image.url
            let altText = image.title
            HttpUtils.getBinary(imageUrl, (data) => {
                callback(imageUrl, data, altText)
            })
    })
}

exports.imageOfTheDay = imageOfTheDay