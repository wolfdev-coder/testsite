//server-reviews.js
const { requireAuth } = require('./server-middleware');

module.exports = (app, db) => {
  app.get('/api/reviews', (req, res) => {
    const { productId } = req.query;
    let query = 'SELECT reviews.*, users.username FROM reviews JOIN users ON reviews.userId = users.id';
    const params = [];
    if (productId) {
      query += ' WHERE reviews.productId = ?';
      params.push(productId);
    }
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Ошибка при получении отзывов:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      res.json(rows);
    });
  });

  app.post('/api/reviews', requireAuth, (req, res) => {
    const { productId, comment } = req.body;
    const userId = req.session.user.id;
    console.log('Добавление отзыва:', { productId, userId, comment });

    if (!productId || !comment) {
      return res.status(400).json({ error: 'Требуются productId и comment', code: 'MISSING_FIELDS' });
    }

    db.get('SELECT id FROM products WHERE id = ?', [productId], (err, product) => {
      if (err || !product) {
        console.error('Ошибка при проверке продукта:', err?.message);
        return res.status(404).json({ error: 'Товар не найден', code: 'PRODUCT_NOT_FOUND' });
      }

      db.run(
        'INSERT INTO reviews (productId, userId, comment) VALUES (?, ?, ?)',
        [productId, userId, comment],
        function (err) {
          if (err) {
            console.error('Ошибка при добавлении отзыва:', err.message);
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          res.json({ message: 'Отзыв успешно добавлен', id: this.lastID });
        }
      );
    });
  });

  app.delete('/api/reviews/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    console.log('Удаление отзыва:', { id, userId });

    db.get('SELECT userId FROM reviews WHERE id = ?', [id], (err, review) => {
      if (err) {
        console.error('Ошибка при проверке отзыва:', err.message);
        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
      }
      if (!review) {
        return res.status(404).json({ error: 'Отзыв не найден', code: 'NOT_FOUND' });
      }
      if (review.userId !== userId && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Вы можете удалять только свои отзывы', code: 'FORBIDDEN' });
      }

      db.run('DELETE FROM reviews WHERE id = ?', [id], function (err) {
        if (err) {
          console.error('Ошибка при удалении отзыва:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Отзыв не найден', code: 'NOT_FOUND' });
        }
        res.json({ message: 'Отзыв успешно удален' });
      });
    });
  });
};