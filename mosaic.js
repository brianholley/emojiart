var fs = require('fs')
var im = require('imagemagick')
var os = require('os')
var uuid = require('node-uuid')
var path = require('path')
var rgbToHsl = require('rgb-to-hsl')

function normalize(value, alpha) {
    return Math.floor(value * alpha / 255)
}

function resize(file, outFile, width, height, format) {
    return new Promise((resolve, reject) => {
        let size = `${width}x${height}!`
        im.convert(
            [file, '-resize', size, '-gravity', 'Center', '-format', format, outFile], 
            (err, md) => {
                if (err) throw err
                resolve(outFile)
            })
    })
}

function reduceImageToColor(imageFile) {
    let rgbaFile = path.join(os.tmpdir(), '1x1.png')
    return resize(imageFile, rgbaFile, 1, 1, 'RGBA').then((path) => {
        let bytes = fs.readFileSync(rgbaFile)
        let rgb = {
            red: normalize(bytes[0], bytes[3]),
            green: normalize(bytes[1], bytes[3]),
            blue: normalize(bytes[2], bytes[3]),
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
    })
}

function createColorTable(folder, cacheBase, emojiSize) {
    if (!fs.existsSync(cacheBase)) {
        fs.mkdirSync(cacheBase)
    }
    return new Promise((resolve, reject) => {
        var operations = []
        var colors = {}
        var files = fs.readdirSync(folder)
        for (var file of files) {
            var source = path.join(folder, file)
            var resized = path.join(cacheBase, file)

            operations.push(resize(source, resized, emojiSize, emojiSize, 'PNG24'))
            operations.push(reduceImageToColor(source).then((color) => {
                colors[resized] = color
            }))
        }
        Promise.all(operations).then((res) => resolve(colors))
    })
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

    var columns = 0, rows = 0
    return new Promise((resolve, reject) => {
        im.identify(source, (err, identity) => {
            if (err) throw err
            resolve(identity)
        })
    })
    .then((identity) => {
        columns = Math.round(identity.width / emojiSize)
        rows = Math.round(identity.height / emojiSize)
        
        if (verbose) console.log(`Image size: ${identity.width}x${identity.height}`)
        if (verbose) console.log(`Mosaic size: ${columns}x${rows}`)
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

        let sourceRgbaFile = path.join(os.tmpdir(), uuid.v4() + '.rgba')
        return resize(source, sourceRgbaFile, columns, rows, 'RGBA')
    })
    .then((file) => {
        let bytes = fs.readFileSync(file)
        if (bytes.length != rows * columns * 4) {
            throw new Error(`Bad image size, expected: ${rows * columns * 4}, actual: ${bytes.length}`)
        }
        var emojis = []
        for (var p=0; p < bytes.length / 4; p++) {
            let rgb = {
                red: normalize(bytes[p*4], bytes[p*4+3]),
                green: normalize(bytes[p*4+1], bytes[p*4+3]),
                blue: normalize(bytes[p*4+2], bytes[p*4+3]),
            }
            if (verbose) console.log("Target pixel rgb: " + JSON.stringify(rgb))
            emojis.push(findTileForPixel(rgb, hslTable))
        }
        if (emojis.length != rows * columns) {
            throw new Error(`Bad emoji-map size, expected: ${rows * columns}, actual: ${emojis.length}`)
        }
        return emojis
    })
    .then((emojis) => {
        const tileSize = 10

        return new Promise((resolve, reject) => {
            var cmd = [] 
            var ctiles = Math.ceil(columns / tileSize) 
            var rtiles = Math.ceil(rows / tileSize)
            if (verbose) console.log("Tile size: " + ctiles + "x" + rtiles)
            
            var tempFolder = path.join(os.tmpdir(), '' + uuid.v4()) 
            fs.mkdirSync(tempFolder)

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
    })
}
exports.generate = generate