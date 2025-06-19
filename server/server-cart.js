const { requireAuth } = require('./server-middleware');

module.exports = (app, db) => {
  // Добавление в корзину
  app.post('/api/cart/add', requireAuth, (req, res) => {
    const { productId, quantity = 1, userId } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('POST /api/cart/add:', { productId, quantity, userId, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      console.warn('Invalid quantity:', quantity);
      return res.status(400).json({ error: 'quantity должно быть целым числом >= 1', code: 'INVALID_QUANTITY' });
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
        return res.status(404).json({ error: 'Товар не найден', code: 'PRODUCT_NOT_FOUND' });
      }

      db.get(
        'SELECT quantity FROM cart WHERE userId = ? AND productId = ?',
        [effectiveUserId, productId],
        (err, row) => {
          if (err) {
            console.error('Ошибка при проверке корзины:', err.message);
            return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
          }

          if (row) {
            const newQuantity = row.quantity + quantity;
            db.run(
              'UPDATE cart SET quantity = ? WHERE userId = ? AND productId = ?',
              [newQuantity, effectiveUserId, productId],
              function (err) {
                if (err) {
                  console.error('Ошибка при обновлении корзины:', err.message);
                  return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
                }
                console.log('Cart updated:', { productId, newQuantity });
                res.json({ message: 'Количество обновлено в корзине', productId, quantity: newQuantity });
              }
            );
          } else {
            db.run(
              'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?)',
              [effectiveUserId, productId, quantity],
              function (err) {
                if (err) {
                  console.error('Ошибка при добавлении в корзину:', err.message);
                  return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
                }
                console.log('Cart item added:', { id: this.lastID, productId, quantity });
                res.json({ message: 'Товар добавлен в корзину', id: this.lastID, productId, quantity });
              }
            );
          }
        }
      );
    });
  });

  // Обновление количества в корзине
  app.patch('/api/cart/:productId', requireAuth, (req, res) => {
    const productId = parseInt(req.params.productId);
    const { quantity, userId } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('PATCH /api/cart/:productId:', { productId, quantity, userId, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      console.warn('Invalid quantity:', quantity);
      return res.status(400).json({ error: 'Требуется quantity >= 1', code: 'INVALID_QUANTITY' });
    }
    if (!Number.isInteger(effectiveUserId) || effectiveUserId < 1) {
      console.warn('Invalid userId:', effectiveUserId);
      return res.status(400).json({ error: 'Требуется userId для не-админов', code: 'INVALID_USER_ID' });
    }

    db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        console.error('Ошибка при проверке продукта:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!product) {
        console.warn('Product not found:', productId);
        return res.status(404).json({ error: 'Товар не найден', code: 'PRODUCT_NOT_FOUND' });
      }

      db.get(
        'SELECT quantity FROM cart WHERE userId = ? AND productId = ?',
        [effectiveUserId, productId],
        (err, row) => {
          if (err) {
            console.error('Ошибка при проверке корзины:', err.message);
            return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
          }
          if (!row) {
            console.warn('Cart item not found:', { userId: effectiveUserId, productId });
            return res.status(404).json({ error: 'Товар не найден в корзине', code: 'CART_ITEM_NOT_FOUND' });
          }

          db.run(
            'UPDATE cart SET quantity = ? WHERE userId = ? AND productId = ?',
            [quantity, effectiveUserId, productId],
            function (err) {
              if (err) {
                console.error('Ошибка при обновлении корзины:', err.message);
                return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
              }
              if (this.changes === 0) {
                console.warn('No cart item updated:', { userId: effectiveUserId, productId });
                return res.status(404).json({ error: 'Товар не найден в корзине', code: 'CART_ITEM_NOT_FOUND' });
              }
              console.log('Cart updated:', { productId, quantity });
              res.json({ message: 'Количество обновлено', productId, quantity });
            }
          );
        }
      );
    });
  });

  // Получение корзины
  app.get('/api/cart', requireAuth, (req, res) => {
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const userId = isAdmin && Number.isInteger(parseInt(req.query.userId)) && parseInt(req.query.userId) > 0 ? parseInt(req.query.userId) : sessionUserId;
    console.log('GET /api/cart:', { sessionUserId, userId, isAdmin });

    if (!Number.isInteger(userId) || userId < 1) {
      console.warn('Invalid userId:', userId);
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }

    db.all(
      'SELECT cart.userId, cart.productId, cart.quantity FROM cart WHERE cart.userId = ?',
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Ошибка при получении корзины:', err.message);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        console.log('Cart fetched:', rows);
        res.json(rows);
      }
    );
  });

  // Получение записи корзины по ID
  app.get('/api/cart/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    console.log('GET /api/cart/:id:', { id, sessionUserId, isAdmin });

    if (!Number.isInteger(id) || id < 1) {
      console.warn('Invalid id:', id);
      return res.status(400).json({ error: 'id должен быть целым числом больше 0', code: 'INVALID_ID' });
    }

    let query = 'SELECT userId, productId, quantity FROM cart WHERE id = ?';
    let params = [id];
    if (!isAdmin) {
      query += ' AND userId = ?';
      params.push(sessionUserId);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        console.error('Ошибка при получении записи корзины:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!row) {
        console.warn('Cart item not found:', id);
        return res.status(404).json({ error: 'Запись не найдена', code: 'CART_ITEM_NOT_FOUND' });
      }
      console.log('Cart item fetched:', row);
      res.json(row);
    });
  });

  // Обновление записи корзины по ID
  app.put('/api/cart/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const { userId, productId, quantity } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('PUT /api/cart/:id:', { id, userId, productId, quantity, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(id) || id < 1) {
      console.warn('Invalid id:', id);
      return res.status(400).json({ error: 'id должен быть целым числом больше 0', code: 'INVALID_ID' });
    }
    if (!Number.isInteger(effectiveUserId) || effectiveUserId < 1) {
      console.warn('Invalid userId:', effectiveUserId);
      return res.status(400).json({ error: 'userId должен быть целым числом больше 0', code: 'INVALID_USER_ID' });
    }
    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      console.warn('Invalid quantity:', quantity);
      return res.status(400).json({ error: 'quantity должно быть целым числом >= 1', code: 'INVALID_QUANTITY' });
    }

    db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        console.error('Ошибка при проверке продукта:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!product) {
        console.warn('Product not found:', productId);
        return res.status(404).json({ error: 'Товар не найден', code: 'PRODUCT_NOT_FOUND' });
      }

      let query = 'SELECT id FROM cart WHERE id = ?';
      let params = [id];
      if (!isAdmin) {
        query += ' AND userId = ?';
        params.push(sessionUserId);
      }

      db.get(query, params, (err, row) => {
        if (err) {
          console.error('Ошибка при проверке корзины:', err.message);
          return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
        }
        if (!row) {
          console.warn('Cart item not found or access denied:', id);
          return res.status(404).json({ error: 'Запись не найдена или доступ запрещен', code: 'CART_ITEM_NOT_FOUND' });
        }

        db.run(
          'UPDATE cart SET userId = ?, productId = ?, quantity = ? WHERE id = ?',
          [effectiveUserId, productId, quantity, id],
          function (err) {
            if (err) {
              console.error('Ошибка при обновлении корзины:', err.message);
              return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
            }
            if (this.changes === 0) {
              console.warn('No cart item updated:', id);
              return res.status(404).json({ error: 'Запись не найдена', code: 'CART_ITEM_NOT_FOUND' });
            }
            console.log('Cart item updated:', { id, userId: effectiveUserId, productId, quantity });
            res.json({ message: 'Запись корзины обновлена', id });
          }
        );
      });
    });
  });

  // Удаление из корзины
  app.delete('/api/cart/:productId', requireAuth, (req, res) => {
    const productId = parseInt(req.params.productId);
    const { userId } = req.body;
    const sessionUserId = req.session.user.id;
    const isAdmin = req.session.user.role === 'admin';
    const effectiveUserId = isAdmin && Number.isInteger(userId) && userId > 0 ? userId : sessionUserId;
    console.log('DELETE /api/cart/:productId:', { productId, userId, sessionUserId, effectiveUserId, isAdmin });

    if (!Number.isInteger(productId) || productId < 1) {
      console.warn('Invalid productId:', productId);
      return res.status(400).json({ error: 'productId должен быть целым числом больше 0', code: 'INVALID_PRODUCT_ID' });
    }
    if (!Number.isInteger(effectiveUserId) || effectiveUserId < 1) {
      console.warn('Invalid userId:', effectiveUserId);
      return res.status(400).json({ error: 'Требуется userId для не-админов', code: 'INVALID_USER_ID' });
    }

    db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        console.error('Ошибка при проверке продукта:', err.message);
        return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
      }
      if (!product) {
        console.warn('Product not found:', productId);
        return res.status(404).json({ error: 'Товар не найден', code: 'PRODUCT_NOT_FOUND' });
      }

      db.run(
        'DELETE FROM cart WHERE userId = ? AND productId = ?',
        [effectiveUserId, productId],
        function (err) {
          if (err) {
            console.error('Ошибка при удалении из корзины:', err.message);
            return res.status(500).json({ error: 'Ошибка базы данных', code: 'DB_ERROR' });
          }
          if (this.changes === 0) {
            console.warn('Cart item not found:', { userId: effectiveUserId, productId });
            return res.status(404).json({ error: 'Товар не найден в корзине', code: 'CART_ITEM_NOT_FOUND' });
          }
          console.log('Cart item deleted:', { userId: effectiveUserId, productId });
          res.json({ message: 'Товар удален из корзины' });
        }
      );
    });
  });
};