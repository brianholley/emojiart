// Web server for Heroku
// TODO: Can this run as a Heroku worker dyno instead?
// var express = require('express')
// var app = express()
// app.get('/', function(req, res) { res.send('Robot status nominal.') })
// app.listen(process.env.PORT || 5000)

var fs = require('fs')
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
        this.onMentioned = params.onMentioned
    }

    start() {
        console.log("Listening to mentions stream...")

        var stream = this.twit.stream('user') 
        stream.on('tweet', this.onTweet)
    }

    onTweet(tweet) {
        if (tweet.entities.user_mentions.some((m) => { return m.screen_name == this.name })) {
            this.onMentioned(this, tweet)
        }
    }

    tweetReply(text, replyToId, filepath, altText) {
        var b64content = fs.readFileSync(filepath, { encoding: 'base64' })
        this.twit.post('media/upload', { media_data: b64content }, (err, data, response) => {
            var mediaIdStr = data.media_id_string
            var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

            this.twit.post('media/metadata/create', meta_params, (err, data, response) => {
                if (err) throw err
                
                var params = { 
                    status: text,
                    in_reply_to_status_id: replyToId, 
                    media_ids: [mediaIdStr] 
                }
                this.twit.post('statuses/update', params, (err, data, response) => {
                    if (err) throw err
                    console.log("Tweet success")
                })
            })
        })
    }
}

module.exports = TwitterReplyBot