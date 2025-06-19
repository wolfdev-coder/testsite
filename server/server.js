const express = require('express');
const path = require('path');
const db = require('./database');
const { setupProductRoutes } = require('./productPage');
const { setupMiddleware } = require('./server-middleware');
const setupAuthRoutes = require('./server-auth');
const setupReviewsRoutes = require('./server-reviews');
const setupRatingsRoutes = require('./server-ratings');
const setupProductsRoutes = require('./server-products');
const setupCartRoutes = require('./server-cart');
const setupFavoritesRoutes = require('./server-favorites');
const setupDeliveryRoutes = require('./server-delivery');
const setupGenericRoutes = require('./server-routes');
const app = express();

// Проверка, что все функции маршрутизации определены
const routeSetups = {
  setupAuthRoutes,
  setupReviewsRoutes,
  setupRatingsRoutes,
  setupProductsRoutes,
  setupCartRoutes,
  setupFavoritesRoutes,
  setupDeliveryRoutes,
  setupGenericRoutes,
  setupProductRoutes
};
for (const [name, setupFn] of Object.entries(routeSetups)) {
  if (typeof setupFn !== 'function') {
    console.error(`Ошибка: ${name} не является функцией`);
    process.exit(1);
  }
}

setupMiddleware(app);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../profile.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

setupAuthRoutes(app, db);
setupReviewsRoutes(app, db);
setupRatingsRoutes(app, db);
setupProductsRoutes(app, db);
setupCartRoutes(app, db);
setupFavoritesRoutes(app, db);
setupDeliveryRoutes(app, db);
setupGenericRoutes(app, db);
setupProductRoutes(app);

app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера', code: 'SERVER_ERROR' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});