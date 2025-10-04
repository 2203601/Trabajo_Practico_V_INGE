const express = require("express");
const cors = require("cors");
const sqlite3 = require('sqlite3').verbose();
const path = require("path");

const app = express();   // ✅ primero creamos la app

app.use(cors({
  origin: "http://localhost:8080", // el frontend
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false               // ⚠️ o true solo si usas cookies
}));

// Conexión a SQLite
const dbPath = path.join(__dirname, 'coffeehub.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Error conectando a SQLite:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Conectado a la base de datos SQLite en:", dbPath);
    initializeDatabase();
  }
});

// Inicializar base de datos
function initializeDatabase() {
  // Crear tabla si no existe (Sintaxis SQLite)
  db.run(`CREATE TABLE IF NOT EXISTS coffees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    origin TEXT NOT NULL,
    type TEXT NOT NULL,
    price REAL NOT NULL,
    roast TEXT NOT NULL,
    rating REAL NOT NULL,
    description TEXT
  )`, (err) => {
    if (err) {
      console.error("❌ Error creando tabla:", err.message);
      return;
    }
    console.log("✅ Tabla 'coffees' verificada.");
    insertSampleData();
  });
}

// Insertar datos de ejemplo
function insertSampleData() {
  db.get("SELECT COUNT(*) as count FROM coffees", (err, row) => {
    if (err) {
      console.error("❌ Error al contar cafés:", err.message);
      return;
    }

    if (row.count === 0) {
      const samples = [
        ["Blue Mountain Supreme", "Jamaica", "Arábica", 85.99, "Medio", 4.9, "Notas suaves de chocolate y nuez."],
        ["Ethiopian Yirgacheffe", "Etiopía", "Arábica", 24.99, "Claro", 4.7, "Café floral y afrutado con notas cítricas."],
        ["Colombian Supremo", "Colombia", "Arábica", 18.50, "Medio", 4.6, "Equilibrio perfecto entre acidez y cuerpo."],
        ["Brazilian Santos", "Brasil", "Arábica", 15.99, "Medio-Oscuro", 4.3, "Café suave y cremoso con notas de chocolate."],
        ["Vietnamese Robusta", "Vietnam", "Robusta", 12.99, "Oscuro", 4.1, "Café intenso y fuerte, alto en cafeína."],
        ["Hawaiian Kona", "Hawái", "Arábica", 65.00, "Medio", 4.8, "Café aromático con notas de mantequilla y especias."]
      ];

      const stmt = db.prepare(`INSERT INTO coffees (name, origin, type, price, roast, rating, description)
                               VALUES (?, ?, ?, ?, ?, ?, ?)`);
      
      let insertedCount = 0;
      samples.forEach((sample) => {
        stmt.run(sample, (err) => {
          if (err) console.error("❌ Error insertando café:", err.message);
          else insertedCount++;
        });
      });

      stmt.finalize((err) => {
        if (err) console.error("❌ Error finalizando inserciones:", err.message);
        else console.log(`✅ ${insertedCount} cafés de ejemplo cargados.`);
      });
    } else {
      console.log(`ℹ️  Base de datos ya contiene ${row.count} cafés.`);
    }
  });
}

// 📌 ENDPOINTS API

// GET /api/products - Obtener todos los cafés
app.get("/api/products", (req, res) => {
  db.all("SELECT * FROM coffees", (err, rows) => {
    if (err) {
      console.error("❌ Error obteniendo cafés:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/products - Agregar un café
app.post("/api/products", (req, res) => {
  const { name, origin, type, price, roast, rating, description } = req.body;
  
  const sql = `INSERT INTO coffees (name, origin, type, price, roast, rating, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [name, origin, type, price, roast, rating, description || "Sin descripción"], function(err) {
    if (err) {
      console.error("❌ Error insertando café:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, ...req.body });
  });
});

// GET /stats - Estadísticas de cafés
app.get("/stats", (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total, 
      AVG(price) as avgPrice,
      (SELECT origin FROM coffees GROUP BY origin ORDER BY COUNT(*) DESC LIMIT 1) as popularOrigin
    FROM coffees
  `;
  
  db.get(statsQuery, (err, row) => {
    if (err) {
      console.error("❌ Error obteniendo estadísticas:", err.message);
      return res.status(500).json({ error: err.message });
    }
    
    const total = row.total || 0;
    const avgPrice = row.avgPrice ? parseFloat(row.avgPrice).toFixed(2) : "0.00";
    const popularOrigin = row.popularOrigin || "-";

    res.json({ total, avgPrice, popularOrigin });
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    database: "SQLite"
  });
});

// Servir archivos estáticos del frontend (opcional, solo para desarrollo local)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, "../frontend")));
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("❌ Error no manejado:", err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Cerrar base de datos al terminar el proceso
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) console.error("❌ Error cerrando base de datos:", err.message);
    else console.log("✅ Conexión a SQLite cerrada.");
    process.exit(0);
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ CoffeeHub Backend corriendo en puerto ${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET  /api/products - Listar cafés`);
  console.log(`   POST /api/products - Agregar café`);
  console.log(`   GET  /stats - Estadísticas`);
  console.log(`   GET  /api/health - Health check`);
});