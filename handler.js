'use strict';

const { MongoClient, ObjectId } = require("mongodb");
const dayjs  = require("dayjs");
const TwitterClient = require('twitter-api-client').TwitterClient;

const ATLAS_URI = `mongodb+srv://${process.env.MDB_USER}:${process.env.MDB_PWD}@${process.env.MDB_CLUSTER}`;

const twitterClient = new TwitterClient({
  apiKey: process.env.CONSUMER_KEY,
  apiSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.CONSUMER_TOKEN,
  accessTokenSecret: process.env.CONSUMER_TOKEN_SECRET,
  ttl: 120, 
  disableCache: true, 
  maxByteSize: 32000000, 
});

async function getRandomTweet() {
    const client = new MongoClient(ATLAS_URI);
    try {
        const database = client.db('ac-beta');
        const tweet = database.collection('tweet');
        const list_tweet = await tweet.aggregate([
            {
              '$match': {
                'status': 'AVAILABLE'
              }
            }, {
              '$sample': {
                'size': 1
              }
            }, {
              '$project': { 
                'tweet': 1
              }
            }
          ]).toArray();
        
        return list_tweet.length > 0 ? list_tweet[0] : "";

      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
}

async function updateTweetStatus(id) {
    const client = new MongoClient(ATLAS_URI);
    try {
        const database = client.db('ac-beta');
        const tweet = database.collection('tweet');
        const filter = { "_id": ObjectId(id) };
        const updateDoc = {
            "$set": {
                "status": "USED",
                "usedDate": dayjs().format()
            }
        }
        const result = await tweet.updateOne(filter, updateDoc);
        return result;
      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
}


module.exports.run = async (event, context) => {
  console.log(`Your cron function "${context.functionName}" ran at ${dayjs().format()}`);
  try {
    const tweet = await getRandomTweet();

    if (tweet !== null) {
      // Sending tweet
      console.log(`Sending ${tweet.tweet}`); 
      await twitterClient.tweetsV2.createTweet({text: tweet.tweet});
      await updateTweetStatus(tweet._id);

    } else {
      // Set error message
      console.log(`Tweet record is not corret - ${tweet}`);
    }
  } catch(error) {
    console.log(`Error: ${error}`);
  }
};
