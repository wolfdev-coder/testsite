function setupRatingsRoutes(app, db) {
  // Получение всех рейтингов или по фильтрам
  app.get('/api/ratings', (req, res) => {
    const { productId, userId } = req.query;
    let query = 'SELECT * FROM ratings';
    let params = [];

    if (productId && userId) {
      query += ' WHERE productId = ? AND userId = ?';
      params = [parseInt(productId), parseInt(userId)];
    } else if (productId) {
      query += ' WHERE productId = ?';
      params = [parseInt(productId)];
    } else if (userId) {
      query += ' WHERE userId = ?';
      params = [parseInt(userId)];
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Ошибка при получении рейтингов:', err);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      res.json(rows);
    });
  });

  // Получение рейтинга по ID
  app.get('/api/ratings/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Некорректный ID', code: 'INVALID_ID' });
    }
    db.get('SELECT * FROM ratings WHERE id = ?', [id], (err, row) => {
      if (err) {
        console.error('Ошибка при получении рейтинга:', err);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Рейтинг не найден', code: 'RATING_NOT_FOUND' });
      }
      res.json(row);
    });
  });

  // Добавление или обновление рейтинга
  app.post('/api/ratings', (req, res) => {
    const { productId, userId, rating } = req.body;

    // Валидация
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating должен быть целым числом от 1 до 5', code: 'INVALID_RATING' });
    }

    // Проверка пользователя
    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!user) {
        return res.status(404).json({ error: `Пользователь с ID ${userId} не найден`, code: 'USER_NOT_FOUND' });
      }

      // Проверка продукта
      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        if (!product) {
          return res.status(404).json({ error: `Продукт с ID ${productId} не найден`, code: 'PRODUCT_NOT_FOUND' });
        }

        // Проверка существующего рейтинга
        db.get('SELECT id FROM ratings WHERE productId = ? AND userId = ?', [productId, userId], (err, existingRating) => {
          if (err) {
            console.error('Ошибка при проверке рейтинга:', err);
            return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
          }

          if (existingRating) {
            // Обновление рейтинга
            db.run(
              'UPDATE ratings SET rating = ? WHERE id = ?',
              [rating, existingRating.id],
              function (err) {
                if (err) {
                  console.error('Ошибка при обновлении рейтинга:', err);
                  return res.status(500).json({ error: 'Ошибка обновления рейтинга', code: 'DB_ERROR' });
                }
                res.json({ message: 'Рейтинг обновлён', id: existingRating.id });
              }
            );
          } else {
            // Добавление нового рейтинга
            db.run(
              'INSERT INTO ratings (productId, userId, rating) VALUES (?, ?, ?)',
              [productId, userId, rating],
              function (err) {
                if (err) {
                  console.error('Ошибка при добавлении рейтинга:', err);
                  return res.status(500).json({ error: 'Ошибка добавления рейтинга', code: 'DB_ERROR' });
                }
                res.json({ message: 'Рейтинг добавлен', id: this.lastID });
              }
            );
          }
        });
      });
    });
  });

  // Обновление рейтинга по ID
  app.put('/api/ratings/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { productId, userId, rating } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ error: 'Некорректный ID', code: 'INVALID_ID' });
    }
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating должен быть целым числом от 1 до 5', code: 'INVALID_RATING' });
    }

    db.get('SELECT id FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        console.error('Ошибка при проверке пользователя:', err);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!user) {
        return res.status(404).json({ error: `Пользователь с ID ${userId} не найден`, code: 'USER_NOT_FOUND' });
      }

      db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
          console.error('Ошибка при проверке продукта:', err);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        if (!product) {
          return res.status(404).json({ error: `Продукт с ID ${productId} не найден`, code: 'PRODUCT_NOT_FOUND' });
        }

        db.run(
          'UPDATE ratings SET productId = ?, userId = ?, rating = ? WHERE id = ?',
          [productId, userId, rating, id],
          function (err) {
            if (err) {
              console.error('Ошибка при обновлении рейтинга:', err);
              return res.status(500).json({ error: 'Ошибка обновления рейтинга', code: 'DB_ERROR' });
            }
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Рейтинг не найден', code: 'RATING_NOT_FOUND' });
            }
            res.json({ message: 'Рейтинг обновлён' });
          }
        );
      });
    });
  });

  // Удаление рейтинга
  app.delete('/api/ratings/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Некорректный ID', code: 'INVALID_ID' });
    }
    db.run('DELETE FROM ratings WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Ошибка при удалении рейтинга:', err);
        return res.status(500).json({ error: 'Ошибка удаления рейтинга', code: 'DB_ERROR' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Рейтинг не найден', code: 'RATING_NOT_FOUND' });
      }
      res.json({ message: 'Рейтинг удалён' });
    });
  });
}

module.exports = setupRatingsRoutes;