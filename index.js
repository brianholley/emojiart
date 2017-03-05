var fs = require('fs')
var mime = require('mime-types')
var schedule = require('node-schedule')
var os = require('os')
var path = require('path')
var rp = require('request-promise-native')
require('use-strict')

var Bing = require('./bing-iotd')
var Flickr = require('./flickr-iotd')
var mosaic = require('./mosaic')
var Nasa = require('./nasa-iotd')
var NatGeo = require('./natgeo-potd')
var TwitterReplyBot = require('./twitter-replybot')
var Wikipedia = require('./wikipedia-potd')

const emojiSize = 16
var tileset = new mosaic.Tileset(
    path.join('.', 'emojis', 'e1-png', 'png_512'),
    path.join(os.homedir(), 'emojis'),
    emojiSize)

let sources = [ 
    {name: 'Bing', action: () => Bing.imageOfTheDay()}, 
    {name: 'Nasa', action: () => Nasa.imageOfTheDay(process.env.NASA_API_KEY)}, 
    {name: 'Wikipedia', action: () => Wikipedia.imageOfTheDay()}, 
    {name: 'Flickr', action: () => Flickr.imageOfTheDay()},
    {name: 'NatGeo', action: () => NatGeo.imageOfTheDay()},
]

function downloadImage(imageInfo) {
    return rp({uri: imageInfo.imageUrl, encoding: null, resolveWithFullResponse: true}).then(response => {
        let contentType = response.headers["content-type"]
        return {
            imageUrl: imageInfo.imageUrl,
            altText: imageInfo.altText,
            imageData: response.body, 
            contentType: contentType
        }
    })
}

// Test usage: test <input> <output>
if (process.argv.length >= 5 && process.argv[2] == "test") {
    let input = process.argv[3]
    let output = process.argv[4]
    console.log(`TEST MODE: ${input} => ${output}`)

    let source = sources.find(s => s.name == input);
    if (source !== undefined) {
        source.action().then(imageInfo => {
            return downloadImage(imageInfo)
        }).then(image => {
            let ext = mime.extension(image.contentType)
            let iotd = path.join(os.tmpdir(), `bingiotd.${ext}`)
            fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})
            return mosaic.generate(iotd, output, tileset, {emojiSize: emojiSize})
        })
        .then(() => { console.log("Finished!") })
        .catch(reason => { console.log(reason) })
    } 
    else {
        mosaic.generate(input, output, tileset, {emojiSize: emojiSize})
            .then(() => { console.log("Finished!") })
            .catch(reason => { console.log(reason) })
    }
    return
}

let recentTweets = (bot) => {
    return new Promise((resolve, reject) => {
        bot.twit.get('statuses/user_timeline', { count: 20 }, (err, data, response) => {
            let tweets = data.map(t => { 
                return { 
                    date: new Date(t.created_at),
                    url: t.entities.urls[0].expanded_url
                }
            }).reduce((acc, val) => { 
                acc[val.url] = val.date 
                return acc
            }, {})
            console.log(`Found ${Object.keys(tweets).length} previously tweeted urls`)
            resolve(tweets)
        })
    })
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
            rp({uri: pictures[0], encoding: null, resolveWithFullResponse: true}).then(response => {
                let contentType = response.headers["content-type"]
                let ext = mime.extension(contentType)
                let inputFile = path.join(os.tmpdir(), `tweet_${tweet.id}.${ext}`)
                fs.writeFileSync(inputFile, response.body, {encoding: 'binary'})
                
                let outputFile = path.join(os.tmpdir(), `tweet_${tweet.id}_emoji.png`)
                mosaic.generate(inputFile, outputFile, tileset, {
                    emojiSize: emojiSize
                }).then(() => {
                    console.log(`${tweet.id}: Emojification complete`)
                    
                    let text = '@' + tweet.user.screen_name
                    let altText = `Emojified art for @${tweet.user.screen_name}`
                    b.tweetReply(text, tweet.id, outputFile, altText)
                }).catch(reason => {
                    console.log(`${tweet.id}: Failure: ${reason}`)
                })
            })
        }
    }
})

recentTweets(bot).then(state => {
    bot.start()

    var rule = new schedule.RecurrenceRule()
    rule.hour = new schedule.Range(0, 23)
    rule.minute = 0
    console.log("Starting background job...")
    schedule.scheduleJob(rule, () => {
        let source = Math.floor(Math.random() * sources.length)

        let name = sources[source].name
        let now = new Date()
        console.log(`========================================`)
        console.log(`Waking up at ${now}, checking ${name}`)
        
        var url = ''
        var outputFile = path.join(os.tmpdir(), 'emoji.png')
        sources[source].action().then(imageInfo => {
            console.log(`Image found`)
            console.log(`${imageInfo.imageUrl}`)
            if (imageInfo.imageUrl in state) {
                return new Promise((resolve, reject) => reject('Image already complete - skipped'))
            }
            console.log(`Downloading`)
            return downloadImage(imageInfo)
        }).then(image => {
            console.log(`Downloaded`)
            url = image.imageUrl
            let ext = mime.extension(image.contentType)
            let iotd = path.join(os.tmpdir(), `source.${ext}`)
            fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})
            console.log(`Generating mosaic`)
            return mosaic.generate(iotd, outputFile, tileset, {emojiSize: emojiSize})
        }).then(() => { 
            console.log(`Mosaic complete`)
            
            let text = `${name} image of the day #emojified (source:${url})`
            console.log(`Tweeting`)
            return bot.tweetReply(text, 0, outputFile, text)
        }).then(() => {
            console.log("Finished!") 
            state[url] = new Date()
            console.log("Back to sleep")
        }).catch(reason => {
            console.log("Error during emojification:") 
            console.log(reason)
            console.log("Back to sleep") 
        })
    })
})

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
