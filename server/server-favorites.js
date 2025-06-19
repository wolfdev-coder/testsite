const { requireAuth } = require('./server-middleware');

function setupFavoritesRoutes(app, db) {
  // Получение избранного
  app.get('/api/favorites', requireAuth, (req, res) => {
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const userId = isAdmin ? parseInt(req.query.userId) || sessionUserId : sessionUserId;
    console.log('GET /api/favorites:', { sessionUserId, userId, isAdmin });

    if (!Number.isInteger(userId) || userId < 1) {
      console.warn('Invalid userId:', userId);
      return res.status(400).json({ error: 'userId обязателен и должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }

    db.all(
      `SELECT favorites.*, products.name, products.price, products.firmName
       FROM favorites
       JOIN products ON favorites.productId = products.id
       WHERE favorites.userId = ?`,
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Ошибка при получении избранного:', err.message);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        console.log('Favorites fetched:', rows);
        const favorites = rows.map(row => ({
          userId: row.userId,
          productId: row.productId,
          name: row.name || 'Неизвестный товар',
          price: parseFloat(row.price) || 0,
          firmName: row.firmName || 'Неизвестный производитель'
        }));
        res.json(favorites);
      }
    );
  });

  // Добавление в избранное
  app.post('/api/favorites', requireAuth, (req, res) => {
    const { userId, productId } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('POST /api/favorites:', { userId, productId, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(effectiveUserId) || effectiveUserId < 1) {
      console.warn('Invalid userId:', effectiveUserId);
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }
    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }

    db.get('SELECT id FROM users WHERE id = ?', [effectiveUserId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!user) {
        console.warn('User not found:', effectiveUserId);
        return res.status(404).json({ error: `Пользователь с ID ${effectiveUserId} не найден`, code: 'USER_NOT_FOUND' });
      }

      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        if (!product) {
          console.warn('Product not found:', productId);
          return res.status(404).json({ error: `Продукт с ID ${productId} не найден`, code: 'PRODUCT_NOT_FOUND' });
        }

        db.get('SELECT id FROM favorites WHERE userId = ? AND productId = ?', [effectiveUserId, productId], (err, existingFavorite) => {
          if (err) {
            console.error('Ошибка при проверке избранного:', err.message);
            return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
          }
          if (existingFavorite) {
            console.warn('Favorite already exists:', { userId: effectiveUserId, productId });
            return res.status(400).json({ error: 'Товар уже в избранном', code: 'FAVORITE_ALREADY_EXISTS' });
          }

          db.run(
            'INSERT INTO favorites (userId, productId) VALUES (?, ?)',
            [effectiveUserId, productId],
            function (err) {
              if (err) {
                console.error('Ошибка при добавлении в избранное:', err.message);
                return res.status(500).json({ error: 'Ошибка добавления в избранное', code: 'DB_ERROR' });
              }
              console.log('Favorite added:', { id: this.lastID, userId: effectiveUserId, productId });
              res.json({ message: 'Добавлено в избранное', id: this.lastID, isFavorite: true });
            }
          );
        });
      });
    });
  });

  // Переключение статуса избранного
  app.post('/api/favorites/toggle', requireAuth, (req, res) => {
    const { productId, userId } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('POST /api/favorites/toggle:', { productId, userId, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(effectiveUserId) || effectiveUserId < 1) {
      console.warn('Invalid userId:', effectiveUserId);
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }

    db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        console.error('Ошибка при проверке продукта:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!product) {
        console.warn('Product not found:', productId);
        return res.status(404).json({ error: `Продукт с ID ${productId} не найден`, code: 'PRODUCT_NOT_FOUND' });
      }

      db.get('SELECT id FROM favorites WHERE userId = ? AND productId = ?', [effectiveUserId, productId], (err, favorite) => {
        if (err) {
          console.error('Ошибка при проверке избранного:', err.message);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        if (favorite) {
          db.run('DELETE FROM favorites WHERE id = ?', [favorite.id], function (err) {
            if (err) {
              console.error('Ошибка при удалении из избранного:', err.message);
              return res.status(500).json({ error: 'Ошибка удаления из избранного', code: 'DB_ERROR' });
            }
            console.log('Favorite removed:', { userId: effectiveUserId, productId });
            res.json({ message: 'Удалено из избранного', isFavorite: false });
          });
        } else {
          db.run(
            'INSERT INTO favorites (userId, productId) VALUES (?, ?)',
            [effectiveUserId, productId],
            function (err) {
              if (err) {
                console.error('Ошибка при добавлении в избранное:', err.message);
              return res.status(500).json({ error: 'Ошибка добавления в избранное', code: 'DB_ERROR' });
              }
              console.log('Favorite added:', { id: this.lastID, userId: effectiveUserId, productId });
              res.json({ message: 'Добавлено в избранное', isFavorite: true, id: this.lastID });
            }
          );
        }
      });
    });
  });

  // Удаление из избранного
  app.delete('/api/favorites/:productId', requireAuth, (req, res) => {
    const productId = parseInt(req.params.productId);
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const userId = isAdmin && Number.isInteger(req.body.userId) && req.body.userId > 0 ? req.body.userId : sessionUserId;
    console.log('DELETE /api/favorites/:productId:', { productId, userId, sessionUserId, isAdmin });

    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(userId) || userId < 1) {
      console.warn('Invalid userId:', userId);
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }

    db.get('SELECT id FROM favorites WHERE userId = ? AND productId = ?', [userId, productId], (err, favorite) => {
      if (err) {
        console.error('Ошибка при проверке избранного:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!favorite) {
        console.warn('Favorite not found:', { userId, productId });
        return res.status(404).json({ error: 'Запись в избранном не найдена', code: 'FAVORITE_NOT_FOUND' });
      }

      db.run('DELETE FROM favorites WHERE userId = ? AND productId = ?', [userId, productId], function (err) {
        if (err) {
          console.error('Ошибка при удалении из избранного:', err.message);
          return res.status(500).json({ error: 'Ошибка удаления из избранного', code: 'DB_ERROR' });
        }
        console.log('Favorite deleted:', { userId, productId });
        res.json({ message: 'Удалено из избранного' });
      });
    });
  });
}

module.exports = setupFavoritesRoutes;