var rp = require('request-promise-native')
var cheerio = require('cheerio')

function imageOfTheDay() {
    let url = 'http://www.nationalgeographic.com/photography/photo-of-the-day/'
    return rp({uri: url, followAllRedirects: true}).then(html => {
        let $ = cheerio.load(html)
        let imageUrl = $("meta").filter((i,el) => el.attribs.name == "twitter:image:src").attr("content")
        let altText = $("meta").filter((i,el) => el.attribs.name == "description").attr("content")
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