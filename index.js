var fs = require('fs')
var imagemagick = require('imagemagick-native')
require('use-strict')

var mosaic = require('./mosaic.js')

var depth = imagemagick.quantumDepth()
function normalize(value, alpha) {
    return Math.floor((value / (1 << depth)) * 256 * (alpha / (1 << depth)))
}

function reduceImageToColor(imageFile) {
    var resized = imagemagick.convert({
        srcData: fs.readFileSync(imageFile),
        width: 1,
        height: 1,
        resizeStyle: 'fill', 
        gravity: 'Center',
        format: 'PNG32'
    }) 
    // Consider quantizeColors to reduce colors to smaller set
    var pixel = imagemagick.getConstPixels({
        srcData: resized,
        x: 0,
        y: 0, 
        rows: 1,
        columns: 1
    })[0]
    var normalizedRgb = {
        red: normalize(pixel.red, pixel.opacity),
        green: normalize(pixel.green, pixel.opacity),
        blue: normalize(pixel.blue, pixel.opacity)
    }
    return normalizedRgb
}

function generateColorTable(folder) {
    var colors = {}
    var files = fs.readdirSync(folder)
    for (var file of files) {
        var source = folder + '/' + file
        colors[file] = reduceImageToColor(source)
    }
    return colors
}

function write1x1Thumbnails(folder, destFolder) {
    var files = fs.readdirSync(folder)
    for (var file of files) {
        var source = folder + '/' + file
        var dest = destFolder + '/' + file
        console.log(source + " => " + dest)

        fs.writeFileSync(dest, 
            imagemagick.convert({
                srcData: fs.readFileSync(source),
                width: 1,
                height: 1,
                resizeStyle: 'fill', 
                gravity: 'Center',
                format: 'PNG32'
        }))
    }
}

var colorTableFile = './emojis/colors.json' 
if (!fs.exists(colorTableFile)) {
    var colors = generateColorTable('./emojis/e1-png/png_512')
    fs.writeFileSync(colorTableFile, JSON.stringify(colors))
}

var colorTable = JSON.parse(fs.readFileSync(colorTableFile))

mosaic.generateMosaic('./tests/color/landscape.jpg', {}, colorTable)
