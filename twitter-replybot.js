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
        if (tweet.entities.user_mentions.some(m => { return m.screen_name == this.name })) {
            this.onMentioned(this, tweet)
        }
    }

    tweetReply(text, replyToId, filepath, altText) {
        return new Promise((resolve, reject) => {
            var b64content = fs.readFileSync(filepath, { encoding: 'base64' })
            this.twit.post('media/upload', { media_data: b64content }, (err, data, response) => {
                if (err) {
                    console.log(`Image upload error: ${b64content.length}`)
                    return reject(err)
                }
                var mediaIdStr = data.media_id_string
                var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

                this.twit.post('media/metadata/create', meta_params, (err, data, response) => {
                    if (err) {
                        console.log(`Media creation error: ${$mediaIdStr}`)
                        return reject(err)
                    }
                    var params = { 
                        status: text,
                        in_reply_to_status_id: replyToId, 
                        media_ids: [mediaIdStr] 
                    }
            
                    this.twit.post('statuses/update', params, (err, data, response) => {
                        if (err) return reject(err)
                        console.log("Tweet success")
                        resolve()
                    })
                })
            })
        })
    }
}

module.exports = TwitterReplyBot