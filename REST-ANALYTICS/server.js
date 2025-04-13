const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const { z } = require("zod");

const app = express();
const port = 8000;
const client = new MongoClient("mongodb://localhost:27017");
let db;

app.use(express.json());

// Product Schema + Product Route here.

// Init mongodb client connection
client.connect().then(() => {
  // Select db to use in mongodb
  db = client.db("myDB");
  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
});

// Schémas Zod généraux
const baseSchema = z.object({
  source: z.string(),
  url: z.string().url(),
  visitor: z.string(),
  createdAt: z.coerce.date(),
  meta: z.record(z.any()),
});

const ViewSchema = baseSchema;
const ActionSchema = baseSchema.extend({
  action: z.string(),
});
const GoalSchema = baseSchema.extend({
  goal: z.string(),
});

// Routes

app.post("/views", async (req, res) => {
  const result = ViewSchema.safeParse(req.body);
  if (!result.success) return res.status(400).send(result);

  const ack = await db.collection("views").insertOne(result.data);
  res.status(201).send({ _id: ack.insertedId, ...result.data });
});

app.post("/actions", async (req, res) => {
  const result = ActionSchema.safeParse(req.body);
  if (!result.success) return res.status(400).send(result);

  const ack = await db.collection("actions").insertOne(result.data);
  res.status(201).send({ _id: ack.insertedId, ...result.data });
});

app.post("/goals", async (req, res) => {
  const result = GoalSchema.safeParse(req.body);
  if (!result.success) return res.status(400).send(result);

  const ack = await db.collection("goals").insertOne(result.data);
  res.status(201).send({ _id: ack.insertedId, ...result.data });
});
