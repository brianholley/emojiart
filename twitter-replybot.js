// Web server for Heroku
// TODO: Can this run as a Heroku worker dyno instead?
// var express = require('express')
// var app = express()
// app.get('/', function(req, res) { res.send('Robot status nominal.') })
// app.listen(process.env.PORT || 5000)

var Twit = require('twit')

class TwitterReplyBot {
    constructor(params) {
        this.name = params.name
        this.twit = new Twit({
            consumer_key:         params.consumer_key,
            consumer_secret:      params.consumer_secret,
            access_token:         params.access_token,
            access_token_secret:  params.access_token_secret,
            timeout_ms:           60*1000,
        })
        this.onTweet = this.onTweet.bind(this)
        this.onTweetAction = params.onTweet

        var stream = this.twit.stream('user') 
        stream.on('tweet', this.onTweet)
    }

    onTweet(tweet) {
        console.log('@' + tweet.user.screen_name + ': ' + tweet.text)
        if (tweet.entities.user_mentions.some((m) => { return m.screen_name == this.name })) {
            console.log('@ this user')
        }
        this.onTweetAction(tweet, this.twit)
    }
}


// T.get('statuses/mentions_timeline', { count: 100 }, function(err, data, response) {
//   console.log(data)
// })

function postPictureReply(twit, replyToUser, replyToId, altText, filepath) {
    var b64content = fs.readFileSync(filepath, { encoding: 'base64' })

    twit.post('media/upload', { media_data: b64content }, (err, data, response) => {
        var mediaIdStr = data.media_id_string
        var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

        twit.post('media/metadata/create', meta_params, (err, data, response) => {
            if (err) throw err
            
            var params = { 
                status: replyToUser,
                in_reply_to_status_id: replyToId, 
                media_ids: [mediaIdStr] 
            }
            twit.post('statuses/update', params, (err, data, response) => {
                if (err) throw err
            })
        })
    })
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
            //tweet.extended_entities.media.expanded_url
// [{"id":795115189536366600,"id_str":"795115189536366592","indices":[39,62],"media_url":"http://pbs.twimg.com/media/CwjRDVvVIAAPpqq.jpg","media_url_https":"https://pbs.twimg.com/media/CwjRDVvVIAAPpqq.jpg","url":"https://t.co/hxsXPrWvla","display_url":"pic.twitter.com/hxsXPrWvla","expanded_url":"https://twitter.com/BaileyLAKings/status/795115202345766912/photo/1","type":"photo","sizes":{"large":{"w":2048,"h":1029,"resize":"fit"},"thumb":{"w":150,"h":150,"resize":"crop"},"small":{"w":680,"h":342,"resize":"fit"},"medium":{"w":1200,"h":603,"resize":"fit"}},"source_status_id":795115202345766900,"source_status_id_str":"795115202345766912","source_user_id":205938397,"source_user_id_str":"205938397"}]
        }

        //let replyTo = '@' + tweet.user.screen_name
        //let altText = "Emojified art for " + replyTo
        //postPictureReply(twit, replyTo, tweet.id, altText, './out/circle-tiled.png')
    }
})

var fs = require('fs')
var mosaic = require('./mosaic')
var Bing = require('./bing-iotd')

var output = './out/bingiotd.png'
Bing.imageOfTheDay().then((image) => {
    let iotd = './temp/bingiotd.jpg'
    fs.writeFileSync(iotd, image.imageData, {encoding: 'binary'})

    const emojiSize = 16
    var colorTableFile = './cache/colors.json' 
    if (!fs.existsSync(colorTableFile)) {
        console.log("Generating color table")
        var colors = mosaic.createColorTable('./emojis/e1-png/png_512', './cache', emojiSize)
        fs.writeFileSync(colorTableFile, JSON.stringify(colors))
    }

    var colorTable = JSON.parse(fs.readFileSync(colorTableFile))
    return mosaic.generate(fs.readFileSync(iotd), output, colorTable, {emojiSize: emojiSize})
}).then(() => {
    postPictureReply(bot.twit, 'Bing image of the day #emojified', 0, 'Bing image of the day, emojified', output)
})
.catch((reason) => {console.log(reason)})

    