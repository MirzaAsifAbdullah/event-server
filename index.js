import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
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

const AUTH_JWKS_URL = `${process.env.CLIENT_URL || "http://localhost:3000"}/api/auth/jwks`;
const JWKS = createRemoteJWKSet(new URL(AUTH_JWKS_URL));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }
  const token = authHeader.slice("Bearer ".length);
  if (!token) {
    return res.status(401).send({ msg: "Unauthorized!" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);

    if (!payload.email) {
      return res.status(401).send({ msg: "Unauthorized!" });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).send({ msg: "Unauthorized!" });
  }
};

app.post("/add-event", verifyToken, async (req, res) => {
  try {
    const { title, imageUrl, type, location, date, description } = req.body;

    if (!title || !date) {
      return res.status(400).send({
        message: "Title and date are required",
      });
    }

    const result = await eventCollection.insertOne({
      title,
      imageUrl,
      type,
      location,
      date,
      description,
      email: req.user.email,
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

app.get("/my-events", verifyToken, async (req, res) => {
  try {
    const events = await eventCollection
      .find({ email: req.user.email })
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

app.put("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { title, imageUrl, type, location, date, description } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const result = await eventCollection.updateOne(
      {
        _id: new ObjectId(id),
        email: req.user.email,
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
      },
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

app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid event ID",
      });
    }

    const result = await eventCollection.deleteOne({
      _id: new ObjectId(id),
      email: req.user.email,
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

app.post("/join-event", verifyToken, async (req, res) => {
  try {
  
    const { eventId, eventTitle, imageUrl, description, location, date, type } =
      req.body;

    if (!eventId) {
      return res.status(400).send({
        message: "eventId is required",
      });
    }

    const joinInfo = {
      eventId,
      eventTitle,
      imageUrl,
      description,
      location,
      date,
      type,
      userEmail: req.user.email,
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

app.get("/joined-events/:email", verifyToken, async (req, res) => {
  try {
    const result = await joinedEventsCollection
      .find({ userEmail: req.user.email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});

app.get("/joined-events", verifyToken, async (req, res) => {
  try {
    const result = await joinedEventsCollection
      .find({ userEmail: req.user.email })
      .sort({ joinedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch joined events",
    });
  }
});

app.delete("/joined-events/:eventId", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).send({
        message: "Event ID is required",
      });
    }

    const result = await joinedEventsCollection.deleteOne({
      eventId,
      userEmail: req.user.email,
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
