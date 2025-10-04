// ================================
// ☕ CoffeeHub Backend - better-sqlite3
// ================================
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;

// ================================
// 🌐 CORS
// ================================
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:4000",
  "https://coffeehub-front-qa-argqggbvc3g0gkdc.brazilsouth-01.azurewebsites.net",
  "https://coffeehub-front-prod.azurewebsites.net",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS bloqueado para: ${origin}`);
    return callback(new Error(`CORS no permitido para: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.options('*', cors());
app.use(express.json());

// ================================
// 💾 Config DB (better-sqlite3)
// ================================
const dbPath = path.join(__dirname, "coffeehub.db");
const db = new Database(dbPath);

console.log("Conectado a la base de datos CoffeeHub.");

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    origin TEXT NOT NULL,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    roast TEXT NOT NULL,
    rating REAL NOT NULL,
    description TEXT
  )
`);

// ================================
// 📦 Endpoints API
// ================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET todos los productos
app.get("/api/products", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM products");
    const rows = stmt.all();
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener productos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST agregar producto
app.post("/api/products", (req, res) => {
  const { name, origin, type, price, roast, rating, description } = req.body;
  
  try {
    const stmt = db.prepare(
      `INSERT INTO products (name, origin, type, price, roast, rating, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(name, origin, type, price, roast, rating, description);
    res.status(201).json({ id: result.lastInsertRowid, ...req.body });
  } catch (err) {
    console.error("Error al insertar producto:", err);
    res.status(500).json({ error: "Error al crear producto" });
  }
});

// GET estadísticas
app.get("/api/stats", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(price), 2) as avgPrice,
        (SELECT origin FROM products GROUP BY origin ORDER BY COUNT(*) DESC LIMIT 1) as popularOrigin
      FROM products
    `);
    const row = stmt.get();
    res.json({
      total: row.total || 0,
      avgPrice: row.avgPrice || 0,
      popularOrigin: row.popularOrigin || "N/A"
    });
  } catch (err) {
    console.error("Error al obtener estadísticas:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ================================
// 🚀 Iniciar servidor
// ================================
app.listen(PORT, () => {
  console.log(`CoffeeHub Backend corriendo en puerto ${PORT}`);
  console.log(`Orígenes permitidos:`, allowedOrigins);
});