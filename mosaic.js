var fs = require('fs')
var im = require('imagemagick')
var imagemagick = require('imagemagick-native')
var os = require('os')
var uuid = require('node-uuid')
var path = require('path')
var rgbToHsl = require('rgb-to-hsl')

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

function createColorTable(folder, cacheBase, emojiSize) {
    if (!fs.existsSync(cacheBase)) {
        fs.mkdirSync(cacheBase)
    }

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

exports.createColorTable = createColorTable

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
    
    for (var i=0; i < 30; i++) {
        if ((hue + i) in hslTable) {
            var best = hslTable[(hue + i)][0]
            var delta = Math.sqrt(Math.pow(best.sat - sat, 2) + Math.pow(best.lum - lum, 2))
            for (var opt of hslTable[(hue + i)].slice(1)) {
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

function generate(source, dest, colorTable, options, callback) {
    var verbose = (options !== undefined && "verbose" in options ? options.verbose : false)
    var emojiSize = (options !== undefined && "size" in options ? options.size : 16)
    var maxMosaicSize = (options !== undefined && "maxMosaicSize" in options ? options.maxMosaicSize : 200)
    
    var hslTable = colorTableToHslTable(colorTable)

    var identity = imagemagick.identify({ srcData: source })
    var columns = Math.ceil(identity.width / emojiSize)
    var rows = Math.ceil(identity.height / emojiSize)

    var tempFolder = path.join(os.tmpdir(), '' + uuid.v4()) 
    fs.mkdirSync(tempFolder)

    if (verbose) console.log("Mosaic size: " + columns + "x" + rows)
    if (columns > rows && columns > maxMosaicSize) {
        columns = maxMosaicSize
        rows = Math.floor(identity.height / identity.width * columns)
        if (verbose) console.log("Snapped to " + columns + "x" + rows)
    }
    else if (rows > columns && rows > maxMosaicSize) {
        rows = maxMosaicSize
        columns = Math.floor(identity.width / identity.height * rows)
        if (verbose) console.log("Snapped to " + columns + "x" + rows)
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
        if (verbose) console.log("Target pixel rgb: " + JSON.stringify(rgb))
        emojis.push(findTileForPixel(rgb, hslTable))
    }

    if (emojis.length != rows * columns) {
        throw new Error("Error: " + emojis.length + " != " + rows + " x " + columns)
    }

    const tileSize = 10

    return new Promise((resolve, reject) => {
        var cmd = [] 
        var ctiles = Math.ceil(columns / tileSize) 
        var rtiles = Math.ceil(rows / tileSize)
        if (verbose) console.log("Tile size: " + ctiles + "x" + rtiles)
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
                        if (verbose) console.log(cmd)
                        im.convert(cmd, (err, md) => {
                            if (err) throw err
                            resolve()
                        })
                    }
                })
                if (verbose) console.log("Tile: " + c + "," + r)

                var offset = '+' + (tileSize * emojiSize * c) + '+' + (tileSize * emojiSize * r)
                cmd = [...cmd, '-page', offset, tileName]
            }
        }
    })
}
exports.generate = generate