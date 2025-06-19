// server-routes.js
const { requireAdmin } = require('./server-middleware');

module.exports = (app, db) => {
  const tableSchemas = {
    users: ['username', 'email', 'password', 'role'],
    products: ['name', 'miscellaneous', 'price', 'lastPrice', 'imageLogo', 'firmName', 'soldQuantity', 'manufacturingYear'],
    reviews: ['productId', 'userId', 'comment'],
    ratings: ['productId', 'userId', 'rating'],
    favorites: ['userId', 'productId'],
    cart: ['userId', 'productId', 'quantity'],
    delivery: ['userId', 'productId', 'count', 'date', 'time', 'status']
  };

  const validateData = (table, data) => {
    const schema = tableSchemas[table];
    const keys = Object.keys(data);
    if (keys.length === 0) return false;
    return keys.every(key => schema.includes(key) || key === 'id');
  };

  const tables = ['users', 'products', 'reviews', 'ratings', 'favorites', 'cart', 'delivery'];

  tables.forEach(table => {
    const apiPath = table === 'favorites' ? '/api/favoritesAdmin' : table === 'cart' ? '/api/cartAdmin' : `/api/${table}`;
    app.get(`${apiPath}/:id`, (req, res) => {
      const { id } = req.params;
      console.log(`GET ${apiPath}/:id`, { id });
      db.get(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, row) => {
        if (err) {
          console.error(`Ошибка при получении записи из ${table}:`, err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!row) {
          return res.status(404).json({ error: 'Запись не найдена', code: 'NOT_FOUND' });
        }
        res.json(row);
      });
    });

    app.get(apiPath, (req, res) => {
      console.log(`GET ${apiPath}`);
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (err) {
          console.error(`Ошибка при получении данных из ${table}:`, err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        console.log(`${table} rows:`, rows);
        res.json(rows);
      });
    });

    app.post(`/api/${table}`, requireAdmin, (req, res) => {
      const data = req.body;
      console.log(`POST /api/${table}`, data);
      if (!validateData(table, data)) {
        return res.status(400).json({ error: 'Некорректные данные', code: 'INVALID_DATA' });
      }
      const keys = Object.keys(data);
      const values = keys.map(k => data[k]);
      db.run(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        values,
        function (err) {
          if (err) {
            console.error(`Ошибка при добавлении в ${table}:`, err.message);
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Запись уже существует', code: 'DUPLICATE_ENTRY' });
            }
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          res.json({ id: this.lastID, ...data });
        }
      );
    });

    app.put(`${apiPath}/:id`, requireAdmin, (req, res) => {
      const { id } = req.params;
      const data = req.body;
      console.log(`PUT ${apiPath}/${id}`, { id, data });
      if (!validateData(table, data)) {
        return res.status(400).json({ error: 'Некорректные данные', code: 'INVALID_DATA' });
      }
      const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(data), id];
      db.run(
        `UPDATE ${table} SET ${fields} WHERE id = ?`,
        values,
        function (err) {
          if (err) {
            console.error(`Ошибка при обновлении ${table}:`, err.message);
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Запись уже существует', code: 'DUPLICATE_ENTRY' });
            }
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Запись не найдена', code: 'NOT_FOUND' });
          }
          res.json({ message: 'Данные обновлены', id });
        }
      );
    });

    app.delete(`${apiPath}/:id`, requireAdmin, (req, res) => {
      const { id } = req.params;
      console.log(`DELETE ${apiPath}/${id}`, { id });
      db.run(
        `DELETE FROM ${table} WHERE id = ?`,
        [id],
        function (err) {
          if (err) {
            console.error(`Ошибка при удалении из ${table}:`, err.message);
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Запись не найдена', id });
          }
          res.json({ message: 'Успешно удалено', changes: this.changes });
        }
      );
    });
  });

  app.post('/api/reviews/add', requireAdmin, (req, res) => {
    const { productId, userId, comment } = req.body;
    console.log('POST /api/reviews/add', { productId, userId, comment });
    if (!Number.isInteger(productId) || !Number.isInteger(userId) || !comment) {
      console.log('Invalid data:', { productId, userId, comment });
      return res.status(400).json({ error: 'Все поля обязательны и должны быть корректными', code: 'INVALID_DATA' });
    }
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!user) {
        console.log('User not found:', userId);
        return res.status(400).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      }
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!product) {
          console.log('Product not found:', productId);
          return res.status(400).json({ error: 'Продукт не найден', code: 'PRODUCT_NOT_FOUND' });
        }
        db.run(
          'INSERT INTO reviews (productId, userId, comment) VALUES (?, ?, ?)',
          [productId, userId, comment],
          function (err) {
            if (err) {
              console.error('Ошибка при добавлении отзыва:', err.message);
              return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            console.log('Review added:', { id: this.lastID, productId, userId, comment });
            res.json({ id: this.lastID, productId, userId, comment });
          }
        );
      });
    });
  });

  app.post('/api/ratings/add', requireAdmin, (req, res) => {
    const { productId, userId, rating } = req.body;
    console.log('POST /api/ratings/add', { productId, userId, rating });
    if (!Number.isInteger(productId) || !Number.isInteger(userId) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      console.log('Invalid data:', { productId, userId, rating });
      return res.status(400).json({ error: 'Некорректные данные: все поля должны быть целыми числами, рейтинг от 1 до 5', code: 'INVALID_DATA' });
    }
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!user) {
        console.log('User not found:', userId);
        return res.status(400).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      }
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!product) {
          console.log('Product not found:', productId);
          return res.status(400).json({ error: 'Продукт не найден', code: 'PRODUCT_NOT_FOUND' });
        }
        db.get('SELECT id FROM ratings WHERE productId = ? AND userId = ?', [productId, userId], (err, existing) => {
          if (err) {
            console.error('Ошибка при проверке рейтинга:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (existing) {
            console.log('Rating already exists:', { productId, userId });
            return res.status(400).json({ error: 'Рейтинг уже существует', code: 'RATING_EXISTS' });
          }
          db.run(
            'INSERT INTO ratings (productId, userId, rating) VALUES (?, ?, ?)',
            [productId, userId, rating],
            function (err) {
              if (err) {
                console.error('Ошибка при добавлении рейтинга:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
              }
              console.log('Rating added:', { id: this.lastID, productId, userId, rating });
              res.json({ id: this.lastID, productId, userId, rating });
            }
          );
        });
      });
    });
  });

  app.post('/api/favoritesAdmin/add', requireAdmin, (req, res) => {
    const { userId, productId } = req.body;
    console.log('POST /api/favoritesAdmin/add', { userId, productId });
    if (!Number.isInteger(userId) || !Number.isInteger(productId)) {
      console.log('Invalid data:', { userId, productId });
      return res.status(400).json({ error: 'Некорректные данные: userId и productId должны быть целыми числами', code: 'INVALID_DATA' });
    }
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!user) {
        console.log('User not found:', userId);
        return res.status(400).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      }
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!product) {
          console.log('Product not found:', productId);
          return res.status(400).json({ error: 'Продукт не найден', code: 'PRODUCT_NOT_FOUND' });
        }
        db.get('SELECT id FROM favorites WHERE userId = ? AND productId = ?', [userId, productId], (err, existing) => {
          if (err) {
            console.error('Ошибка при проверке избранного:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (existing) {
            console.log('Favorite already exists:', { userId, productId });
            return res.status(400).json({ error: 'Продукт уже в избранном', code: 'FAVORITE_EXISTS' });
          }
          db.run(
            'INSERT INTO favorites (userId, productId) VALUES (?, ?)',
            [userId, productId],
            function (err) {
              if (err) {
                console.error('Ошибка при добавлении в избранное:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
              }
              console.log('Favorite added:', { id: this.lastID, userId, productId });
              res.json({ id: this.lastID, userId, productId });
            }
          );
        });
      });
    });
  });

  app.post('/api/cartAdmin/add', requireAdmin, (req, res) => {
    const { userId, productId, quantity } = req.body;
    console.log('POST /api/cartAdmin/add', { userId, productId, quantity });
    if (!Number.isInteger(userId) || !Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      console.log('Invalid data:', { userId, productId, quantity });
      return res.status(400).json({ error: 'Некорректные данные: все поля должны быть целыми числами, количество > 0', code: 'INVALID_DATA' });
    }
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!user) {
        console.log('User not found:', userId);
        return res.status(400).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      }
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!product) {
          console.log('Product not found:', productId);
          return res.status(400).json({ error: 'Продукт не найден', code: 'PRODUCT_NOT_FOUND' });
        }
        db.get('SELECT id, quantity FROM cart WHERE userId = ? AND productId = ?', [userId, productId], (err, existing) => {
          if (err) {
            console.error('Ошибка при проверке корзины:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (existing) {
            db.run(
              'UPDATE cart SET quantity = ? WHERE id = ?',
              [existing.quantity + quantity, existing.id],
              function (err) {
                if (err) {
                  console.error('Ошибка при обновлении корзины:', err.message);
                  return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
                }
                console.log('Cart updated:', { id: existing.id, userId, productId, quantity: existing.quantity + quantity });
                res.json({ id: existing.id, userId, productId, quantity: existing.quantity + quantity });
              }
            );
          } else {
            db.run(
              'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?)',
              [userId, productId, quantity],
              function (err) {
                if (err) {
                  console.error('Ошибка при добавлении в корзину:', err.message);
                  return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
                }
                console.log('Cart added:', { id: this.lastID, userId, productId, quantity });
                res.json({ id: this.lastID, userId, productId, quantity });
              }
            );
          }
        });
      });
    });
  });

  app.post('/api/delivery/add', requireAdmin, (req, res) => {
    const { userId, productId, count, date, time, status } = req.body;
    console.log('POST /api/delivery/add', { userId, productId, count, date, time, status });
    if (!Number.isInteger(userId) || !Number.isInteger(productId) || !Number.isInteger(count) || count < 1 || !date) {
      console.log('Invalid data:', { userId, productId, count, date, time, status });
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены корректно', code: 'INVALID_DATA' });
    }
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!user) {
        console.log('User not found:', userId);
        return res.status(400).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      }
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!product) {
          console.log('Product not found:', productId);
          return res.status(400).json({ error: 'Продукт не найден', code: 'PRODUCT_NOT_FOUND' });
        }
        db.run(
          'INSERT INTO delivery (userId, productId, count, date, time, status) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, productId, count, date, time || null, status || null],
          function (err) {
            if (err) {
              console.error('Ошибка при добавлении доставки:', err.message);
              return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            console.log('Delivery added:', { id: this.lastID, userId, productId, count, date, time, status });
            res.json({ id: this.lastID, userId, productId, count, date, time, status });
          }
        );
      });
    });
  });

  app.get('/api/photos', (req, res) => {
    console.log('GET /api/photos');
    db.all('SELECT * FROM photos', [], (err, rows) => {
      if (err) {
        console.error('Ошибка при получении фотографий:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      console.log('Photos rows:', rows);
      res.json(rows);
    });
  });
};