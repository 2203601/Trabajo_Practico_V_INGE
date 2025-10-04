const express = require("express");
const cors = require("cors");
const sqlite3 = require('sqlite3').verbose();
const path = require("path");

const app = express();
app.use(cors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json());

// Conexión a SQLite
const db = new sqlite3.Database(path.join(__dirname, 'coffeehub.db'), (err) => {
  if (err) console.error("❌ Error conectando a SQLite:", err.message);
  else console.log("✅ Conectado a la base de datos SQLite.");
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
  } else {
    console.log("✅ Conectado a MySQL en", process.env.DB_HOST || "localhost"); 
  }
});

// 📌 Crear tabla si no existe
db.query(`CREATE TABLE IF NOT EXISTS coffees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  origin VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  roast VARCHAR(50) NOT NULL,
  rating DECIMAL(2,1) NOT NULL,
  description TEXT
)`, (err) => {
    if (err) console.error("❌ Error creando tabla:", err.message);
});

// 📌 Insertar cafés de ejemplo solo si la tabla está vacía
db.query("SELECT COUNT(*) as count FROM coffees", (err, results) => {
    if (err) {
        console.error("❌ Error al contar cafés:", err.message);
        return;
    }

    if (results[0].count === 0) {
        const samples = [
            ["Blue Mountain Supreme", "Jamaica", "Arábica", 85.99, "Medio", 4.9, "Notas suaves de chocolate y nuez."],
            ["Ethiopian Yirgacheffe", "Etiopía", "Arábica", 24.99, "Claro", 4.7, "Café floral y afrutado con notas cítricas."],
            ["Colombian Supremo", "Colombia", "Arábica", 18.50, "Medio", 4.6, "Equilibrio perfecto entre acidez y cuerpo."],
            ["Brazilian Santos", "Brasil", "Arábica", 15.99, "Medio-Oscuro", 4.3, "Café suave y cremoso con notas de chocolate."],
            ["Vietnamese Robusta", "Vietnam", "Robusta", 12.99, "Oscuro", 4.1, "Café intenso y fuerte, alto en cafeína."],
            ["Hawaiian Kona", "Hawái", "Arábica", 65.00, "Medio", 4.8, "Café aromático con notas de mantequilla y especias."]
        ];

        const sql = `INSERT INTO coffees (name, origin, type, price, roast, rating, description)
                     VALUES ?`;
        
        db.query(sql, [samples], (err, result) => {
            if (err) console.error("❌ Error insertando cafés:", err.message);
            else console.log(`✅ ${result.affectedRows} cafés de ejemplo cargados.`);
        });
    }
});

// 📌 Endpoints API
app.get("/coffees", (req, res) => {
  db.query("SELECT * FROM coffees", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post("/coffees", (req, res) => {
  const { name, origin, type, price, roast, rating, description } = req.body;
  const sql = `INSERT INTO coffees (name, origin, type, price, roast, rating, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, origin, type, price, roast, rating, description], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, ...req.body });
  });
});

app.get("/stats", (req, res) => {
  const statsQuery = `
    SELECT 
      COUNT(*) as total, 
      AVG(price) as avgPrice,
      (SELECT origin FROM coffees GROUP BY origin ORDER BY COUNT(*) DESC LIMIT 1) as popularOrigin
    FROM coffees
  `;
  
  db.query(statsQuery, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const row = results[0];
    const total = row.total;
    const avgPrice = row.avgPrice ? parseFloat(row.avgPrice).toFixed(2) : 0;
    const popularOrigin = row.popularOrigin || "-";

    res.json({ total, avgPrice, popularOrigin });
  });
});


// 📌 Servir frontend (Se mantiene la configuración para servir los archivos estáticos)
app.use(express.static(path.join(__dirname, "../frontend")));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ CoffeeHub corriendo en http://localhost:${PORT}`);
});