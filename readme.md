emojiart
========
Images-to-emoji generator (a la ascii-art). Converts pictures to emoji mosaics from file or a variety of common image sources. Provides a friendly twitter emoji bot.

 
## Dependencies

-   Imagemagick needs to be installed separately from here: [ImageMagick](http://imagemagick.org/)
-   All other dependencies are installed via ````npm install````


## Run modes

**Twitter bot mode** 

-   Reply to twitter picture posts
-   Post images of the day from various services when they're available

````
npm start
````


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


## Image attribution
 
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
- Emoji provided free by [EmojiOne](http://emojione.com)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
