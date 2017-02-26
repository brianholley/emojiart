var rp = require('request-promise-native')
var cheerio = require('cheerio')

function pad2(val) { return (val < 10 ? "0" : "") + val; }
function getYYYYMMDD() {
    let d = new Date()
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` 
}

function imageOfTheDay() {
    let url = `https://en.wikipedia.org/wiki/Template:POTD/${getYYYYMMDD()}`
    return rp({uri: url}).then(html => {
        let $ = cheerio.load(html)
        let img = $("div#content img")
        let srcset = img.attr("srcset").split(" ")
        return {
            imageUrl: "http:" + srcset[srcset.length - 2],
            altText: img.attr("alt")
        }
    })
}

exports.imageOfTheDay = imageOfTheDay