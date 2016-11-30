var HttpUtils = require('./httputils')

function imageOfTheDay(apiKey) {
    return new Promise((resolve, reject) => {
        let url = 'https://api.nasa.gov/planetary/apod?api_key=' + apiKey
        HttpUtils.getJson(
            url, 
            (image) => {
                let imageUrl = image.url
                let altText = image.title
                HttpUtils.getBinary(imageUrl, (data) => {
                    resolve({
                        imageUrl: imageUrl, 
                        imageData: data, 
                        altText: altText
                    })
                })
        })
    })
}

exports.imageOfTheDay = imageOfTheDay