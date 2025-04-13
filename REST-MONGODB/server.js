// All other imports here.
const express = require('express');
const { MongoClient, ObjectId } = require("mongodb");
const { z } = require('zod');

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

app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);

  // If Zod parsed successfully the request body
  if (result.success) {
    const { name, about, price, categoryIds } = result.data;
    const categoryObjectIds = categoryIds.map((id) => new ObjectId(id));

    const ack = await db
      .collection("products")
      .insertOne({ name, about, price, categoryIds: categoryObjectIds });

    res.send({
      _id: ack.insertedId,
      name,
      about,
      price,
      categoryIds: categoryObjectIds,
    });
  } else {
    res.status(400).send(result);
  }
});

// Schemas
const ProductSchema = z.object({
  _id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
  categoryIds: z.array(z.string()),
});
const CreateProductSchema = ProductSchema.omit({ _id: true });
const CategorySchema = z.object({
  _id: z.string(),
  name: z.string(),
});
const CreateCategorySchema = CategorySchema.omit({ _id: true });

app.get("/products", async (req, res) => {
  const result = await db
    .collection("products")
    .aggregate([
      { $match: {} },
      {
        $lookup: {
          from: "categories",
          localField: "categoryIds",
          foreignField: "_id",
          as: "categories",
        },
      },
    ])
    .toArray();

  res.send(result);
});

app.post("/categories", async (req, res) => {
  const result = await CreateCategorySchema.safeParse(req.body);

  // If Zod parsed successfully the request body
  if (result.success) {
    const { name } = result.data;

    const ack = await db.collection("categories").insertOne({ name });

    res.send({ _id: ack.insertedId, name });
  } else {
    res.status(400).send(result);
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const _id = new ObjectId(req.params.id);

    const result = await db.collection("products").aggregate([
      { $match: { _id } },
      {
        $lookup: {
          from: "categories",
          localField: "categoryIds",
          foreignField: "_id",
          as: "categories",
        },
      },
    ]).toArray();

    if (result.length === 0) {
      return res.status(404).send({ error: "Produit non trouvé" });
    }

    res.send(result[0]);
  } catch (e) {
    res.status(400).send({ error: "ID invalide" });
  }
});


app.put("/products/:id", async (req, res) => {
  const parseResult = await CreateProductSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).send(parseResult);
  }

  try {
    const _id = new ObjectId(req.params.id);
    const { name, about, price, categoryIds } = parseResult.data;
    const categoryObjectIds = categoryIds.map((id) => new ObjectId(id));

    const updateResult = await db.collection("products").updateOne(
      { _id },
      {
        $set: {
          name,
          about,
          price,
          categoryIds: categoryObjectIds,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).send({ error: "Produit non trouvé" });
    }

    res.send({
      _id,
      name,
      about,
      price,
      categoryIds: categoryObjectIds,
    });
  } catch (e) {
    res.status(400).send({ error: "ID invalide" });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const _id = new ObjectId(req.params.id);

    const deleteResult = await db.collection("products").deleteOne({ _id });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).send({ error: "Produit non trouvé" });
    }

    res.send({ message: "Produit supprimé avec succès" });
  } catch (e) {
    res.status(400).send({ error: "ID invalide" });
  }
});

