var rp = require('request-promise-native')
var cheerio = require('cheerio')

function imageOfTheDay() {
    return rp({uri: "https://www.flickr.com/explore/interesting/7days"}).then(html => {
        let $ = cheerio.load(html)
        let images = $(".photo_container").find("a")
        let selected = images.get(Math.floor(Math.random() * images.length))
        let photoPage = "https://www.flickr.com" + selected.attribs.href + "sizes/o/"
        let altText = selected.attribs.title
        return rp({uri: photoPage, followAllRedirects: true}).then(html => {
            let $ = cheerio.load(html)
            return {
                imageUrl: $("div#allsizes-photo img").attr("src"),
                altText: altText
            }
        })
    })
}

exports.imageOfTheDay = imageOfTheDay