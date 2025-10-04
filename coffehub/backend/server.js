// ================================
// ☕ CoffeeHub Backend - CORS FIXED
// ================================
import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;

// ================================
// 🌐 CORS - CONFIGURACIÓN CORREGIDA
// ================================
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:4000",
  "https://coffeehub-front-qa-argqggbvc3g0gkdc.brazilsouth-01.azurewebsites.net",
  "https://coffeehub-front-prod.azurewebsites.net",
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está permitido
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Registrar intentos bloqueados para debugging
    console.warn(`⚠️ CORS bloqueado para: ${origin}`);
    return callback(new Error(`CORS no permitido para: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Si usas cookies/sesiones
}));

// ❗ IMPORTANTE: OPTIONS debe manejarse antes de otros middlewares
app.options('*', cors());

app.use(express.json());

// ================================
// 💾 Config DB (SQLite)
// ================================
const dbPath = path.join(__dirname, "coffeehub.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Error al conectar con SQLite:", err.message);
  else console.log("✅ Conectado a la base de datos CoffeeHub.");
});

// Crear tabla si no existe
db.run(`
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

// GET todos los productos
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener productos:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
    res.json(rows);
  });
});

// POST agregar producto
app.post("/api/products", (req, res) => {
  const { name, origin, type, price, roast, rating, description } = req.body;
  
  db.run(
    `INSERT INTO products (name, origin, type, price, roast, rating, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, origin, type, price, roast, rating, description],
    function(err) {
      if (err) {
        console.error("❌ Error al insertar producto:", err);
        return res.status(500).json({ error: "Error al crear producto" });
      }
      res.status(201).json({ id: this.lastID, ...req.body });
    }
  );
});

// GET estadísticas
app.get("/api/stats", (req, res) => {
  db.get(
    `SELECT 
      COUNT(*) as total,
      ROUND(AVG(price), 2) as avgPrice,
      (SELECT origin FROM products GROUP BY origin ORDER BY COUNT(*) DESC LIMIT 1) as popularOrigin
    FROM products`,
    (err, row) => {
      if (err) {
        console.error("❌ Error al obtener estadísticas:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }
      res.json({
        total: row.total || 0,
        avgPrice: row.avgPrice || 0,
        popularOrigin: row.popularOrigin || "N/A"
      });
    }
  );
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ================================
// 🚀 Iniciar servidor
// ================================
app.listen(PORT, () => {
  console.log(`✅ CoffeeHub Backend corriendo en puerto ${PORT}`);
  console.log(`🔗 Orígenes permitidos:`, allowedOrigins);
});