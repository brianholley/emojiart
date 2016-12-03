var fs = require('fs')
var os = require('os')
var path = require('path')
var rp = require('request-promise-native')
require('use-strict')

var Bing = require('./bing-iotd')
var mosaic = require('./mosaic.js')
var Nasa = require('./nasa-iotd')
var TwitterReplyBot = require('./twitter-replybot')

const emojiSize = 16
// TODO: Save to os.homedir()
// TODO: Refactor into mosaic
var colorTableFile = './cache/colors.json' 
if (!fs.existsSync(colorTableFile)) {
    console.log("Generating color table")
    var colors = mosaic.createColorTable('./emojis/e1-png/png_512', './cache', emojiSize)
    fs.writeFileSync(colorTableFile, JSON.stringify(colors))
}

var colorTable = JSON.parse(fs.readFileSync(colorTableFile))

// Test usage: test <input> <output>
if (process.argv.length >= 5 && process.argv[2] == "test") {
    let input = process.argv[3]
    let output = process.argv[4]
    console.log(`TEST MODE: ${input} => ${output}`)

    if (input == "-bing") {
        Bing.imageOfTheDay().then((image) => {
            let iotd = path.join(os.tmpdir(), 'bingiotd.jpg')
            fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})
            return mosaic.generate(fs.readFileSync(iotd), output, colorTable, {emojiSize: emojiSize})
        })
        .then(() => { console.log("Finished!") })
        .catch((reason) => { console.log(reason) })

    } 
    else if (input == "-nasa") {
        Nasa.imageOfTheDay(process.env.NASA_API_KEY).then((image) => {
            let iotd = path.join(os.tmpdir(), 'nasaiotd.jpg')
            fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})
            return mosaic.generate(fs.readFileSync(iotd), output, colorTable, {emojiSize: emojiSize})
        })
        .then(() => { console.log("Finished!") })
        .catch((reason) => { console.log(reason) })
    } 
    else {
        mosaic.generate(fs.readFileSync(input), output, colorTable, {emojiSize: emojiSize})
            .then(() => { console.log("Finished!") })
            .catch((reason) => { console.log(reason) })
    }
    return
}

function picturesInTweet(tweet) {
    return tweet.entities.media.filter((m) => m.type == "photo").map((m) => {
        return m.media_url_https
    })
}

var bot = new TwitterReplyBot({
    name: "emojiartbot",
    consumer_key:         process.env.TWITTER_CONSUMER_KEY,
    consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
    access_token:         process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
    onMentioned: (b, tweet) => {
        console.log(`${tweet.id}: Mention by ${tweet.user.screen_name}`)
        let pictures = picturesInTweet(tweet)

        if (pictures.length > 0) {
            console.log(`${tweet.id}: Picture count: ${pictures.length}`)
            rp({uri: pictures[0], encoding: null}).then((data) => {
                let inputFile = path.join(os.tmpdir(), `tweet_${tweet.id}.jpg`)
                fs.writeFileSync(inputFile, data, {encoding: 'binary'})
                
                let outputFile = path.join(os.tmpdir(), `tweet_${tweet.id}_emoji.png`)
                mosaic.generate(fs.readFileSync(inputFile), outputFile, colorTable, {
                    emojiSize: emojiSize
                })
                .then(() => {
                    console.log(`${tweet.id}: Emojification complete`)
                    
                    let text = '@' + tweet.user.screen_name
                    let altText = `Emojified art for @${tweet.user.screen_name}`
                    b.tweetReply(text, tweet.id, outputFile, altText)
                })
                .catch((reason) => {
                    console.log(`${tweet.id}: Failure: ${reason}`)
                })
            })
        }
    }
})
bot.start()

// bot.onMentioned(bot, {
//     id: 123456789,
//     user: { screen_name: "mock" },
//     entities: { 
//         media: [{
//             type: "photo",
//             media_url_https: "http://mtv.mtvnimages.com/uri/mgid:file:http:shared:public.articles.mtv.com/wp-content/uploads/2014/08/2001-a-space-odyssey.jpg?width=480&quality=0.85&maxdimension=2000"
//         }]
//     }
// })

// var output = './out/bingiotd.png'
// Bing.imageOfTheDay().then((image) => {
//     let iotd = './temp/bingiotd.jpg'
//     fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})

//     mosaic.generate(fs.readFileSync(iotd), output, colorTable, {
//         emojiSize: emojiSize
//     })
//     .then(() => {
//         let text = `Bing image of the day #emojified (source:${image.imageUrl})`
//         let altText = 'Bing image of the day, emojified'
//         bot.tweetReply(text, 0, output, altText)
//     })
//     .catch((reason) => {console.log(reason)})
// })
