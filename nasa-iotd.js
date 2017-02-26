var rp = require('request-promise-native')

function imageOfTheDay(apiKey) {
    let url = 'https://api.nasa.gov/planetary/apod'
    return rp({uri: url, qs: { api_key: apiKey }, json: true}).then((info) => {
        return {
            imageUrl: info.url,
            altText: info.title
        }
    })
}

exports.imageOfTheDay = imageOfTheDay