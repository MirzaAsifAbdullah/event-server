import express from "express";
import { MongoClient, ObjectId } from "mongodb";
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
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("event");

const eventCollection = db.collection("all-events");
const joinedEventsCollection = db.collection("joined-events");



app.post("/add-event", async (req, res) => {
  try {
    const data = req.body;

    const result = await eventCollection.insertOne({
      ...data,
      createdAt: new Date(),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to add event",
    });
  }
});


app.get("/events", async (req, res) => {
  try {
    const result = await eventCollection.find().toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch events",
    });
  }
});

app.get("/my-events", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const events = await db
      .collection("events")
      .find({ email: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).send(events);
  } catch (error) {
    console.error("Error fetching my events:", error);

    res.status(500).send({
      message: "Failed to fetch events",
    });
  }
});


app.put("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      requesterEmail,
      title,
      imageUrl,
      type,
      location,
      date,
      description,
    } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    if (!requesterEmail) {
      return res.status(401).send({
        message: "User email is required",
      });
    }

    const result = await eventCollection.updateOne(
      {
        _id: new ObjectId(id),
        email: requesterEmail,
      },
      {
        $set: {
          title,
          imageUrl,
          type,
          location,
          date,
          description,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Event not found or unauthorized",
      });
    }

    res.send({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Failed to update event",
    });
  }
});


app.delete("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterEmail } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    if (!requesterEmail) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await eventCollection.deleteOne({
      _id: new ObjectId(id),
      email: requesterEmail, 
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Event not found or unauthorized",
      });
    }

    res.send({
      success: true,
      message: "Event deleted successfully",
    });

  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Delete failed",
    });
  }
});



app.post("/join-event", async (req, res) => {
  try {
    const eventData = req.body;

    const joinInfo = {
      ...eventData,
      joinedAt: new Date(),
    };

    const result = await joinedEventsCollection.insertOne(joinInfo);

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to join event",
    });
  }
});



app.get("/joined-events/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const result = await joinedEventsCollection
      .find({ userEmail: email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});



app.get("/joined-events", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await joinedEventsCollection
      .find({ userEmail: email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});



app.delete("/joined-events/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userEmail } = req.body;

    if (!eventId) {
      return res.status(400).send({
        message: "Event ID is required",
      });
    }

    if (!userEmail) {
      return res.status(400).send({
        message: "Email is required",
      });
    }

    const result = await joinedEventsCollection.deleteOne({
      eventId,
      userEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Registration not found",
      });
    }

    res.send({
      success: true,
      message: "Successfully canceled",
    });
  } catch (error) {
    console.error("Error canceling join:", error);

    res.status(500).send({
      message: "Failed to cancel join",
    });
  }
});


app.get("/", (req, res) => {
  res.send("Hello World!");
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
