var https = require('https')
var url = require('url')

function getJson(urlString, callback) {
    let u = url.parse(urlString)
    https.get({
        hostname: u.hostname,
        port: u.port,
        path: u.path
    }, (res) => {
        res.setEncoding('utf8')
        let json = ''
        res.on('data', (chunk) => json += chunk)
        res.on('end', () => {
            try {
                callback(JSON.parse(json))
            } catch (e) {
                console.log(e.message)
            }
        })
    })
}

function getBinary(urlString, callback) {
    let u = url.parse(urlString)
    https.get({
        hostname: u.hostname,
        port: u.port,
        path: u.path,
        encoding: null
    }, (res) => {
        let bytes = []
        res.on('data', (chunk) => bytes.push(chunk))
        res.on('end', () => {
            try {
                console.log(bytes.length)
                callback(Buffer.concat(bytes))
            } catch (e) {
                console.log(e.message)
            }
        })
    })
}

exports.getJson = getJson
exports.getBinary = getBinary