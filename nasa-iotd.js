var rp = require('request-promise-native')

function imageOfTheDay(apiKey) {
    let url = 'https://api.nasa.gov/planetary/apod'
    return rp({uri: url, qs: { api_key: apiKey }, json: true}).then((info) => {
        let imageUrl = info.url
        let altText = info.title
        return rp({uri: imageUrl, encoding: null, resolveWithFullResponse: true}).then(response => {
            let contentType = response.headers["content-type"]
            return {
                imageUrl: imageUrl, 
                imageData: response.body, 
                contentType: contentType,
                altText: altText
            }
        })
    })
}

exports.imageOfTheDay = imageOfTheDay