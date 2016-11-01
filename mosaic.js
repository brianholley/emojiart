var imagemagick = require('imagemagick-native')
var rgbToHsl = require('rgb-to-hsl')

function generateMosaic(source, tiles, colorTable) {

    var hslTable = {}
    for (var file in colorTable) {
        var c = colorTable[file]
        var hsl = rgbToHsl(c.red, c.green, c.blue) // [hue, "sat%", "lum%"]
        hslTable[hsl[0]] = { 
            sat: parseFloat(hsl[1].substring(0, hsl[1].length-1)) / 100,
            lum: parseFloat(hsl[2].substring(0, hsl[2].length-1)) / 100,
            file: file
        }
    }
}
exports.generateMosaic = generateMosaic