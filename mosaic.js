var fs = require('fs')
var im = require('imagemagick')
var imagemagick = require('imagemagick-native')
var uuid = require('node-uuid')
var rgbToHsl = require('rgb-to-hsl')

var depth = imagemagick.quantumDepth()
var maxColorValue = (1 << depth) - 1;
function normalize(value, alpha) {
    return Math.floor(value / maxColorValue * 255 * (1.0 - (alpha / maxColorValue)))
}

function colorTableToHslTable(colorTable) {
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
    return hslTable
}

function findTileForPixel(rgb, hslTable) {
    var hsl = rgbToHsl(rgb.red, rgb.green, rgb.blue)
    var hue = Math.floor(hsl[0])
    var sat = parseFloat(hsl[1].substring(0, hsl[1].length-1)) / 100
    var lum = parseFloat(hsl[2].substring(0, hsl[2].length-1)) / 100
    //console.log("Target pixel h: " + hue + ", s: " + sat + ", l: " + lum)
    
    for (var i=0; i < 30; i++) {
        if ((hue + i) in hslTable) {
            var best = hslTable[(hue + i)][0]
            var delta = Math.sqrt(Math.pow(best.sat - sat, 2) + Math.pow(best.lum - lum, 2))
            for (var opt of hslTable[(hue + i)].slice(1)) {
                //console.log("\tTrying : " + JSON.stringify(opt))
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
                //console.log("\tTrying : " + JSON.stringify(opt))
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
    throw new Error('Could not find color match for RGB ' + JSON.stringify(rgb))
}

// function assemble(columns, emojis, emojiSize, destFile) {
//     var convertCmd = []
//     for (var p=0; p < emojis.length; p++) {
//         var c = p % columns
//         var r = Math.floor(p / columns)

//         var filename = emojis[p].substring(emojis[p].lastIndexOf('/'))
//         var tempFile = './temp/' + filename
//         if (!fs.existsSync(tempFile)) {
//             fs.writeFileSync(tempFile, imagemagick.convert({
//                 srcData: fs.readFileSync(emojis[p]),
//                 width: emojiSize,
//                 height: emojiSize,
//                 resizeStyle: 'fill', 
//                 gravity: 'Center'
//             }))
//         }

//         var offset = '+' + (emojiSize * c) + '+' + (emojiSize * r)
//         convertCmd = [...convertCmd, '-page', offset, tempFile]
//     }

//     convertCmd = [...convertCmd, '-background', 'white', '-layers', 'mosaic', destFile]
//     //console.log(JSON.stringify(convertCmd))
//     im.convert(convertCmd)
// }

function renderTile(columns, rows, start, rowOffset, emojis, emojiSize, dest, callback) {
    var cmd = []
    for (var r=0; r < rows; r++) {
        for (var c=0; c < columns; c++) {
            var index = start + c + r * rowOffset
            var offset = '+' + (emojiSize * c) + '+' + (emojiSize * r)
            cmd = [...cmd, '-page', offset, emojis[index]]
        }
    }

    cmd = [...cmd, '-background', 'white', '-layers', 'mosaic', dest]
    im.convert(cmd, callback)
}

function generateMosaic(source, dest, colorTable, options) {

    var emojiSize = (options !== undefined && "size" in options ? options.size : 16)
    var maxMosaicSize = (options !== undefined && "maxMosaicSize" in options ? options.maxMosaicSize : 200)
    
    var hslTable = colorTableToHslTable(colorTable)

    var identity = imagemagick.identify({ srcData: source })
    var columns = Math.ceil(identity.width / emojiSize)
    var rows = Math.ceil(identity.height / emojiSize)

    if (!fs.existsSync('./temp')) {
        fs.mkdirSync('./temp')
    }
    var tempFolder = './temp/' + uuid.v4() 
    fs.mkdirSync(tempFolder)

    console.log("Mosaic size: " + columns + "x" + rows)
    if (columns > rows && columns > maxMosaicSize) {
        columns = maxMosaicSize
        rows = Math.floor(identity.height / identity.width * columns)
        console.log("Snapped to " + columns + "x" + rows)
    }
    else if (rows > columns && rows > maxMosaicSize) {
        rows = maxMosaicSize
        columns = Math.floor(identity.width / identity.height * rows)
        console.log("Snapped to " + columns + "x" + rows)
    }

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
        //console.log("Target pixel rgb: " + JSON.stringify(rgb))
        emojis.push(findTileForPixel(rgb, hslTable))
    }

    if (emojis.length != rows * columns) {
        throw ("Error: " + emojis.length + " != " + rows + " x " + columns)
    }

    const tileSize = 10

    var cmd = [] 
    var ctiles = Math.ceil(columns / tileSize) 
    var rtiles = Math.ceil(rows / tileSize)
    console.log("Tile size: " + ctiles + "x" + rtiles)
    var tilesFinished = 0 
    for (var r=0; r < rtiles; r++) {
        for (var c=0; c < ctiles; c++) {
            var tileBase = c * tileSize + r * tileSize * columns
            var tileName = tempFolder + '/tile_' + c + '_' + r + '.png'
            var tileW = (c < ctiles - 1 ? tileSize : columns - c * tileSize) 
            var tileH = (r < rtiles - 1 ? tileSize : rows - r * tileSize)
            renderTile(tileW, tileH, tileBase, columns, emojis, emojiSize, tileName, (err, md) => {
                if (err) throw err
                tilesFinished++
                if (tilesFinished == ctiles * rtiles) {
                    cmd = [...cmd, '-background', 'white', '-layers', 'mosaic', dest]
                    //console.log(cmd)
                    im.convert(cmd)
                }
            })
            console.log("Tile: " + c + "," + r)

            var offset = '+' + (tileSize * emojiSize * c) + '+' + (tileSize * emojiSize * r)
            cmd = [...cmd, '-page', offset, tileName]
        }
    }
}
exports.generateMosaic = generateMosaic