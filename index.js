var fs = require('fs')
var imagemagick = require('imagemagick-native')
var rgbToHsl = require('rgb-to-hsl')
require('use-strict')

var mosaic = require('./mosaic.js')

var depth = imagemagick.quantumDepth()
var maxColorValue = (1 << depth) - 1;
function normalize(value, alpha) {
    return Math.floor(value / maxColorValue * 255 * (1.0 - (alpha / maxColorValue)))
}

function reduceImageToColor(imageFile) {
    var resized = imagemagick.convert({
        srcData: fs.readFileSync(imageFile),
        width: 1,
        height: 1,
        resizeStyle: 'fill', 
        gravity: 'Center',
        format: 'PNG24'
    }) 
    // Consider quantizeColors to reduce colors to smaller set
    var pixel = imagemagick.getConstPixels({
        srcData: resized,
        x: 0,
        y: 0, 
        rows: 1,
        columns: 1
    })[0]
    var rgb = {
        red: normalize(pixel.red, pixel.opacity),
        green: normalize(pixel.green, pixel.opacity),
        blue: normalize(pixel.blue, pixel.opacity)
    }
    var hsl = rgbToHsl(rgb.red, rgb.green, rgb.blue)

    return {
        red: rgb.red,
        green: rgb.green,
        blue: rgb.blue,
        hue: Math.floor(hsl[0]),
        sat: parseFloat(hsl[1].substring(0, hsl[1].length-1)) / 100,
        lum: parseFloat(hsl[2].substring(0, hsl[2].length-1)) / 100,
    }
}

function generateColorTable(folder, cacheBase, emojiSize) {
    var colors = {}
    var files = fs.readdirSync(folder)
    for (var file of files) {
        var source = folder + '/' + file
        var resized = cacheBase + '/' + file

        fs.writeFileSync(resized, imagemagick.convert({
            srcData: fs.readFileSync(source),
            width: emojiSize,
            height: emojiSize,
            resizeStyle: 'fill', 
            gravity: 'Center'
        }))

        colors[resized] = reduceImageToColor(source)
    }
    return colors
}

function main(input, output) {
    const emojiSize = 16

    if (!fs.existsSync('./cache')) {
        fs.mkdirSync('./cache')
    }

    var colorTableFile = './cache/colors.json' 
    if (!fs.existsSync(colorTableFile)) {
        console.log("Generating color table")
        var colors = generateColorTable('./emojis/e1-png/png_512', './cache', emojiSize)
        fs.writeFileSync(colorTableFile, JSON.stringify(colors))
    }

    var colorTable = JSON.parse(fs.readFileSync(colorTableFile))
    mosaic.generateMosaic(fs.readFileSync(input), output, colorTable, {
        emojiSize: emojiSize
    })
}

if (process.argv.length < 4) {
    console.log("Usage: InputImage OutputImage")
    return
}

main(process.argv[2], process.argv[3])