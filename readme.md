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
-   **USRA** USRA Earth science picture of the day


## Container deployment

The emojiart twitterbot can be deployed to a Docker host or Kubernetes cluster via a few easy commands.

**Docker**

Create a ```docker.env``` file containing your access keys:
```
TWITTER_CONSUMER_KEY=...
TWITTER_CONSUMER_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_TOKEN_SECRET=...
NASA_API_KEY=...
```
Then you can easily build and run your container:
```
docker build -t emojiart .
docker run --env-file docker.env -d emojiart 
```

**Kubernetes**

Create a ```secrets.yaml``` file containing your access keys:
```
apiVersion: v1
kind: Secret
metadata:
  name: emojiart-secrets
type: Opaque
data:
  TWITTER_CONSUMER_KEY: ...
  TWITTER_CONSUMER_SECRET: ...
  TWITTER_ACCESS_TOKEN: ...
  TWITTER_ACCESS_TOKEN_SECRET: ...
  NASA_API_KEY: ...
```
Then you can easily build and deploy your container:
```
kubectl config use-context prod
kubectl create -f secrets.yaml

docker build -t emojiart .
kubectl create -f emojiart.yaml
```

## Image attribution
 
-   Emoji provided free by [EmojiOne](http://emojione.com)
