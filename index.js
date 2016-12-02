var fs = require('fs')
var os = require('os')
var path = require('path')
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
    //tweet.extended_entities.media.expanded_url
    // [{"id":795115189536366600,"id_str":"795115189536366592","indices":[39,62],"media_url":"http://pbs.twimg.com/media/CwjRDVvVIAAPpqq.jpg","media_url_https":"https://pbs.twimg.com/media/CwjRDVvVIAAPpqq.jpg","url":"https://t.co/hxsXPrWvla","display_url":"pic.twitter.com/hxsXPrWvla","expanded_url":"https://twitter.com/BaileyLAKings/status/795115202345766912/photo/1","type":"photo","sizes":{"large":{"w":2048,"h":1029,"resize":"fit"},"thumb":{"w":150,"h":150,"resize":"crop"},"small":{"w":680,"h":342,"resize":"fit"},"medium":{"w":1200,"h":603,"resize":"fit"}},"source_status_id":795115202345766900,"source_status_id_str":"795115202345766912","source_user_id":205938397,"source_user_id_str":"205938397"}]

    var pictures = tweet.entities.media.filter((m) => m.type == "photo").map((m) => {
        return m.media_url_https
    })
    return pictures
}

var bot = new TwitterReplyBot({
    name: "emojiartbot",
    consumer_key:         process.env.TWITTER_CONSUMER_KEY,
    consumer_secret:      process.env.TWITTER_CONSUMER_SECRET,
    access_token:         process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
    onTweet: (tweet, twit) => {
        console.log(tweet)
        console.log('tweet.entities.urls: ' + JSON.stringify(tweet.entities.urls))
        console.log('tweet.entities.user_mentions: ' + JSON.stringify(tweet.entities.user_mentions))
        console.log('tweet.extended_entities: ' + JSON.stringify(tweet.extended_entities))
        
        if (tweet.extended_entities !== undefined && tweet.extended_entities.media !== undefined) {
            console.log(JSON.stringify(tweet.extended_entities.media))
        }

        //let replyTo = '@' + tweet.user.screen_name
        //let altText = "Emojified art for " + replyTo
        //postPictureReply(twit, replyTo, tweet.id, altText, './out/circle-tiled.png')
    }
})
bot.start()

var output = './out/bingiotd.png'
Bing.imageOfTheDay().then((image) => {
    let iotd = './temp/bingiotd.jpg'
    fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})

    return mosaic.generate(fs.readFileSync(iotd), output, colorTable, {emojiSize: emojiSize})
}).then(() => {
    bot.tweetReply('Bing image of the day #emojified', 0, output, 'Bing image of the day, emojified')
})
.catch((reason) => {console.log(reason)})
