var rp = require('request-promise-native')
var cheerio = require('cheerio')

function imageOfTheDay () {
    return rp({uri: "http://epod.usra.edu"}).then(html => {
        let $ = cheerio.load(html)
        let a = $(".asset-img-link")
        let imageUrl = a.attr("href")
        let altText = $('.entry-header a').text()
        return {
            imageUrl: imageUrl,
            altText: altText
        }
    })
}

exports.imageOfTheDay = imageOfTheDay
