var rp = require('request-promise-native')
var cheerio = require('cheerio')

function imageOfTheDay() {
    let url = 'http://www.nationalgeographic.com/photography/photo-of-the-day/'
    return rp({uri: url, followAllRedirects: true}).then(html => {
        let $ = cheerio.load(html)
        return {
            imageUrl: $("meta").filter((i,el) => el.attribs.name == "twitter:image:src").attr("content"),
            altText: $("meta").filter((i,el) => el.attribs.name == "description").attr("content")
        }
    })
}

exports.imageOfTheDay = imageOfTheDay