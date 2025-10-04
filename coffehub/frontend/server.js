// server.js - Servidor Express para servir el frontend con variables de entorno
const express = require('express');
const path = require('path');
const app = express();

// Puerto desde variable de entorno (Azure usa PORT)
const PORT = process.env.PORT || 8080;

// URL del backend desde variable de entorno
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Middleware para inyectar variables en HTML
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    const filePath = req.path === '/' 
      ? path.join(__dirname, 'index.html')
      : path.join(__dirname, req.path);
    
    const fs = require('fs');
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return next();
      }
      
      // Inyectar variable en el <head>
      const injected = data.replace(
        '</head>',
        `<script>window.BACKEND_URL = '${BACKEND_URL}';</script></head>`
      );
      
      res.type('html').send(injected);
    });
  } else {
    next();
  }
});

// Servir archivos estáticos
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`✅ Frontend corriendo en puerto ${PORT}`);
  console.log(`🔗 Backend configurado en: ${BACKEND_URL}`);
});