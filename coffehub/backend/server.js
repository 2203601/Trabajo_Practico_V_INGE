// ================================
// ☕ CoffeeHub Backend
// ================================

import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// 🧭 Config básica de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// ================================
// 🌐 CORS (habilitado para dev + Azure)
// ================================
const allowedOrigins = [
  "http://localhost:8080", // desarrollo local
  "http://localhost:4000",
  "https://coffeehub-front-qa-argqggbvc3g0gkdc.brazilsouth-01.azurewebsites.net", // QA
  "https://coffeehub-front-prod.azurewebsites.net", // PROD
];

app.use(
  cors({
    origin: function (origin, callback) {
      // permitir solicitudes sin origen (como curl o postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS bloqueado para este origen: " + origin));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

// ================================
// 💾 Config DB (SQLite por defecto)
// ================================
const dbPath = path.join(__dirname, "coffeehub.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error al conectar con SQLite:", err.message);
  else console.log("✅ Conectado a la base de datos CoffeeHub.");
});

// ================================
// 📦 Endpoints API
// ================================
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      console.error("Error al obtener productos:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    } else {
      res.json(rows);
    }
  });
});

app.get("/api/stats", (req, res) => {
  db.get(
    "SELECT COUNT(*) as totalProducts, AVG(price) as avgPrice FROM products",
    (err, row) => {
      if (err) {
        console.error("Error al obtener estadísticas:", err);
        res.status(500).json({ error: "Error interno del servidor" });
      } else {
        res.json(row);
      }
    }
  );
});

// ================================
// 🌍 Servir frontend (si aplica)
// ================================
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ================================
// 🚀 Iniciar servidor
// ================================
app.listen(PORT, () => {
  console.log(`✅ CoffeeHub Backend corriendo en puerto ${PORT}`);
});
