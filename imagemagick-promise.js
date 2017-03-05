var im = require('imagemagick')

exports.convert = (cmdLine) => {
    return new Promise((resolve, reject) => {
        im.convert(cmdLine, (err, md) => {
            if (err) return reject(err)
            resolve(md)
        })
    })
}

exports.identify = (source) => {
    return new Promise((resolve, reject) => {
        im.identify(source, (err, identity) => {
            if (err) return reject(err)
            resolve(identity)
        })
    })
}
