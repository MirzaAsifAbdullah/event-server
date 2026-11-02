
import express from "express";
import { MongoClient } from "mongodb";
import "dotenv/config";
import cors from "cors";

const app = express();
const port = 5000;
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("event");
const eventCollection =  db.collection("all-events")


app.post("/add-event", async(req, res) => {

   
const data = req.body
  const result = await eventCollection.insertOne(data)

  res.send(result)
})

app.get('/events', async(req, res) => {
  const result = await eventCollection.find().toArray() 
  res.send(result)
})

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
