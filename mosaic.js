var fs = require('fs')
var im = require('imagemagick')
var imagemagick = require('imagemagick-native')
var rgbToHsl = require('rgb-to-hsl')

var depth = imagemagick.quantumDepth()
var maxColorValue = (1 << depth) - 1;
function normalize(value, alpha) {
    return Math.floor(value / maxColorValue * 255 * (1.0 - (alpha / maxColorValue)))
}

function findTileForPixel(rgb, hslTable) {
    var hsl = rgbToHsl(rgb.red, rgb.green, rgb.blue)
    var hue = Math.floor(hsl[0])
    var sat = parseFloat(hsl[1].substring(0, hsl[1].length-1)) / 100
    var lum = parseFloat(hsl[2].substring(0, hsl[2].length-1)) / 100
    console.log("Target pixel h: " + hue + ", s: " + sat + ", l: " + lum)
    
    for (var i=0; i < 20; i++) {
        if ((hue + i) in hslTable) {
            var best = hslTable[(hue + i)][0]
            var delta = Math.sqrt(Math.pow(best.sat - sat, 2) + Math.pow(best.lum - lum, 2))
            for (var opt of hslTable[(hue + i)].slice(1)) {
                console.log("\tTrying : " + JSON.stringify(opt))
                var d = Math.sqrt(Math.pow(opt.sat - sat, 2) + Math.pow(opt.lum - lum, 2))
                if (d < delta) {
                    best = opt
                    delta = d
                }
            }
            if (delta < (i * 0.05)) {
                return best.file
            }
        }
        if ((hue - i) in hslTable) {
            var best = hslTable[(hue - i)][0]
            var delta = Math.sqrt(Math.pow(best.sat - sat, 2) + Math.pow(best.lum - lum, 2))
            for (var opt of hslTable[(hue - i)].slice(1)) {
                console.log("\tTrying : " + JSON.stringify(opt))
                var d = Math.sqrt(Math.pow(opt.sat - sat, 2) + Math.pow(opt.lum - lum, 2))
                if (d < delta) {
                    best = opt
                    delta = d
                }
            }
            if (delta < (i * 0.05)) {
                return best.file
            }
        }
    }
    throw new Exception()
}

function generateMosaic(source, dest, colorTable, options) {

    var emojiSize = (options !== undefined && "size" in options ? options.size : 32)
    
    console.log("Generating hsl table")
    var hslTable = {}
    for (var file in colorTable) {
        var c = colorTable[file]
        var hsl = rgbToHsl(c.red, c.green, c.blue) // [hue, "sat%", "lum%"]
        var hue = Math.floor(hsl[0])
        if (hslTable[hue] === undefined) {
            hslTable[hue] = []
        }
        hslTable[hue] = [...hslTable[hue], {
            hue: hue, 
            sat: parseFloat(hsl[1].substring(0, hsl[1].length-1)) / 100,
            lum: parseFloat(hsl[2].substring(0, hsl[2].length-1)) / 100,
            file: file
        }]
    }

    var identity = imagemagick.identify({
        srcData: source
    })

    console.log("Image is " + identity.width + " x " + identity.height)

    var columns = Math.floor(identity.width / emojiSize)
    var rows = Math.floor(identity.width / emojiSize)

    console.log("Generating " + columns + " x " + rows + " mosaic")

    var resized = imagemagick.convert({
        srcData: source,
        width: columns,
        height: rows,
        resizeStyle: 'fill', 
        gravity: 'Center',
        format: 'PNG24'
    })
    var pixels = imagemagick.getConstPixels({
        srcData: resized,
        x: 0,
        y: 0, 
        rows: rows,
        columns: columns
    })
    var emojis = []
    for (var p of pixels) {
        var rgb = {
            red: normalize(p.red, p.opacity),
            green: normalize(p.green, p.opacity),
            blue: normalize(p.blue, p.opacity)
        }
        console.log("Target pixel rgb: " + JSON.stringify(rgb))
        emojis.push(findTileForPixel(rgb, hslTable))
    }

    console.log("Matched source to emojis")

    var convertCmd = []
    for (var p=0; p < emojis.length; p++) {
        var c = p % columns
        var r = Math.floor(p / columns)

        fs.writeFileSync('./temp/' + emojis[p], imagemagick.convert({
            srcData: fs.readFileSync('./emojis/e1-png/png_512/' + emojis[p]),
            width: emojiSize,
            height: emojiSize,
            resizeStyle: 'fill', 
            gravity: 'Center'
        }))

        var offset = '+' + (emojiSize * c) + '+' + (emojiSize * r)
        convertCmd = [...convertCmd, '-page', offset, './temp/' + emojis[p]]
    }

    convertCmd = [...convertCmd, '-background', 'white', '-layers', 'mosaic', dest]
    console.log(JSON.stringify(convertCmd))
    im.convert(convertCmd)

    console.log("Finished")
}
exports.generateMosaic = generateMosaic