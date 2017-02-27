emojiart
========
Images-to-emoji generator (a la ascii-art)

 
### Dependencies

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
- Node/NPM
- Imagemagick
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


### Run modes

**Twitter bot mode:** 'node index.js'

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
- Reply to twitter picture posts
- Post images of the day when they're available
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


**Test file mode** 

Run emojification on an image (<in_file>) and write the image to disk (<out_file>)
````
npm test <in_file> <out_file>
````

**Test IOTD mode** 

Emoji the image of the day from the specified <service> and write the image to disk (<out_file>)
````
npm test <service> <out_file>
````

**Available services**

-   **Bing** Image of the day
-   **Flickr** Interesting photos of the last 7 days
-   **Nasa** Astronomy picture of the day
-   **NatGeo** (National Geographic) Photo of the day
-   **Wikipedia** Picture of the day


### Images
 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
- Emoji provided free by [EmojiOne](http://emojione.com)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
