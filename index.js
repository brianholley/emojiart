var fs = require('fs')
require('use-strict')

var mosaic = require('./mosaic.js')

function main(input, output) {
    const emojiSize = 16

    var colorTableFile = './cache/colors.json' 
    if (!fs.existsSync(colorTableFile)) {
        console.log("Generating color table")
        var colors = mosaic.createColorTable('./emojis/e1-png/png_512', './cache', emojiSize)
        fs.writeFileSync(colorTableFile, JSON.stringify(colors))
    }

    var colorTable = JSON.parse(fs.readFileSync(colorTableFile))
    mosaic.generate(fs.readFileSync(input), output, colorTable, {emojiSize: emojiSize})
        .then(() => {})
        .catch((reason) => { console.log(reason)})
}

if (process.argv.length < 4) {
    console.log("Usage: InputImage OutputImage")
    return
}

main(process.argv[2], process.argv[3])

// var Bing = require('./bing-iotd')
// Bing.imageOfTheDay().then(
//     (image) => {
//         fs.writeFileSync('./temp/bingiotd.jpg', image.imageData, {encoding: 'binary'})
//         main('./temp/bingiotd.jpg', './out/bingiotd.png')
//     })
// .catch((reason) => {console.log(reason)})

// var Nasa = require('./nasa-iotd')
// Nasa.imageOfTheDay(process.env.NASA_API_KEY).then(
//     (image) => {
//         fs.writeFileSync('./temp/nasaiotd.jpg', image.imageData, {encoding: 'binary'})
//         main('./temp/nasaiotd.jpg', './out/nasaiotd.png')
//     })
// .catch((reason) => {console.log(reason)})