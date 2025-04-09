const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "user", password: "password", port: 5433 });

app.use(express.json());

const FREE_TO_GAME_API_BASE_URL = "https://www.freetogame.com/api";

// Utilisation de l'importation dynamique pour node-fetch
let fetch;
(async () => {
  fetch = (await import("node-fetch")).default;
})();

// Schemas
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

// Schéma pour les utilisateurs
const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
});
const CreateUserSchema = UserSchema.omit({ id: true });
const UpdateUserSchema = UserSchema.omit({ id: true, password: true }).partial();

// Hachage du mot de passe
function hashPassword(password) {
  return crypto.createHash("sha512").update(password).digest("hex");
}

app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);

  // If Zod parsed successfully the request body
  if (result.success) {
    const { name, about, price } = result.data;

    const product = await sql`
      INSERT INTO products (name, about, price)
      VALUES (${name}, ${about}, ${price})
      RETURNING *
      `;

    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/products", async (req, res) => {
  const { name, about, price } = req.query;

  try {
    const filters = [];

    if (name) {
      filters.push(`name ILIKE '%${name}%'`);
    }
    if (about) {
      filters.push(`about ILIKE '%${about}%'`);
    }
    if (price) {
      filters.push(`price <= ${parseFloat(price)}`);
    }

    // Construire dynamiquement la clause WHERE
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const query = `
      SELECT * FROM products
      ${whereClause}
    `;

    const products = await sql.unsafe(query);

    res.send(products);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.get("/products/:id", async (req, res) => {
  const product = await sql`
      SELECT * FROM products WHERE id=${req.params.id}
      `;

  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.delete("/products/:id", async (req, res) => {
  const product = await sql`
      DELETE FROM products
      WHERE id=${req.params.id}
      RETURNING *
      `;

  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

// POST - Crée un nouvel utilisateur
app.post("/users", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, email, password } = result.data;
    const passwordHash = hashPassword(password);

    try {
      const user = await sql`
        INSERT INTO users (username, email, password_hash)
        VALUES (${username}, ${email}, ${passwordHash})
        RETURNING id, username, email
      `;

      res.status(201).send(user[0]);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  } else {
    res.status(400).send(result);
  }
});

// GET - Récupère tous les utilisateurs
app.get("/users", async (req, res) => {
  try {
    const users = await sql`
      SELECT id, username, email FROM users
    `;

    res.send(users);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// GET - Récupère un utilisateur par ID
app.get("/users/:id", async (req, res) => {
  try {
    const user = await sql`
      SELECT id, username, email FROM users WHERE id = ${req.params.id}
    `;

    if (user.length > 0) {
      res.send(user[0]);
    } else {
      res.status(404).send({ message: "User not found" });
    }
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// PUT - Met à jour toute la ressource utilisateur
app.put("/users/:id", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, email, password } = result.data;
    const passwordHash = hashPassword(password);

    try {
      const user = await sql`
        UPDATE users
        SET username = ${username}, email = ${email}, password_hash = ${passwordHash}
        WHERE id = ${req.params.id}
        RETURNING id, username, email
      `;

      if (user.length > 0) {
        res.send(user[0]);
      } else {
        res.status(404).send({ message: "User not found" });
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  } else {
    res.status(400).send(result);
  }
});

// PATCH - Met à jour partiellement la ressource utilisateur
app.patch("/users/:id", async (req, res) => {
  const result = await UpdateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, email } = result.data;

    // Construire dynamiquement les champs à mettre à jour
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).send({ message: "No fields to update" });
    }

    try {
      const user = await sql`
        UPDATE users
        SET ${sql(updates)}
        WHERE id = ${req.params.id}
        RETURNING id, username, email
      `;

      if (user.length > 0) {
        res.send(user[0]);
      } else {
        res.status(404).send({ message: "User not found" });
      }
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).send({ message: "Internal Server Error" });
    }
  } else {
    res.status(400).send(result);
  }
});

// GET - Récupère tous les jeux Free-to-Play
app.get("/f2p-games", async (req, res) => {
  try {
    const response = await fetch(`${FREE_TO_GAME_API_BASE_URL}/games`);
    if (!response.ok) {
      return res.status(response.status).send({ message: "Failed to fetch games" });
    }

    const games = await response.json();
    res.send(games);
  } catch (error) {
    console.error("Error fetching FreeToGame API:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

// GET - Récupère un jeu Free-to-Play par ID
app.get("/f2p-games/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`${FREE_TO_GAME_API_BASE_URL}/game?id=${id}`);
    if (!response.ok) {
      return res.status(response.status).send({ message: "Failed to fetch game details" });
    }

    const game = await response.json();
    res.send(game);
  } catch (error) {
    console.error("Error fetching FreeToGame API:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
