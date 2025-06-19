//server-delivery.js
const { requireAuth, requireAdmin } = require("./server-middleware");

module.exports = (app, db) => {
  app.post("/api/delivery", requireAuth, (req, res) => {
    const { productId, count, date, time, status } = req.body;
    const userId = req.session.user.id;
    console.log("Добавление доставки:", { userId, productId, count, date, time, status });

    if (!productId || !count || !date || !time || !status) {
      return res
        .status(400)
        .json({ error: "Требуются productId, count, date, time, status", code: "MISSING_FIELDS" });
    }
    if (isNaN(count) || count < 1) {
      return res
        .status(400)
        .json({ error: "Количество должно быть положительным", code: "INVALID_QUANTITY" });
    }

    db.get("SELECT id FROM products WHERE id = ?", [productId], (err, product) => {
      if (err || !product) {
        console.error("Ошибка при проверке продукта:", err?.message);
        return res
          .status(404)
          .json({ error: "Товар не найден", code: "PRODUCT_NOT_FOUND" });
      }

      db.run(
        "INSERT INTO delivery (userId, productId, count, date, time, status) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, productId, parseInt(count), date, time, status],
        function (err) {
          if (err) {
            console.error("Ошибка при добавлении доставки:", err.message);
            return res
              .status(500)
              .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
          }
          res.json({
            message: "Доставка добавлена",
            id: this.lastID,
            userId,
            productId,
            count,
            date,
            time,
            status,
          });
        }
      );
    });
  });

  // Новый маршрут для массового создания заказов и очистки корзины
  app.post("/api/delivery/bulk", requireAuth, (req, res) => {
    const { orders } = req.body;
    const userId = req.session.user.id;
    console.log("Массовое добавление доставок:", { userId, orders });

    if (!Array.isArray(orders) || orders.length === 0) {
      return res
        .status(400)
        .json({ error: "Требуется непустой массив заказов", code: "INVALID_DATA" });
    }

    let errors = [];
    let insertedOrders = [];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      // Проверка продуктов
      let pendingChecks = orders.length;
      orders.forEach((order, index) => {
        const { productId, count, date, time, status } = order;
        if (!productId || !count || !date || !time || !status || isNaN(count) || count < 1) {
          errors.push({
            index,
            error: "Некорректные данные заказа",
            code: "INVALID_ORDER_DATA",
          });
          pendingChecks--;
          return;
        }

        db.get("SELECT id FROM products WHERE id = ?", [productId], (err, product) => {
          if (err || !product) {
            errors.push({
              index,
              error: "Товар не найден",
              code: "PRODUCT_NOT_FOUND",
            });
            pendingChecks--;
            return;
          }

          db.run(
            "INSERT INTO delivery (userId, productId, count, date, time, status) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, productId, parseInt(count), date, time, status],
            function (err) {
              if (err) {
                errors.push({
                  index,
                  error: "Ошибка при добавлении доставки",
                  code: "SERVER_ERROR",
                });
                pendingChecks--;
                return;
              }
              insertedOrders.push({
                id: this.lastID,
                userId,
                productId,
                count,
                date,
                time,
                status,
              });
              pendingChecks--;

              if (pendingChecks === 0) {
                if (errors.length > 0) {
                  db.run("ROLLBACK");
                  return res.status(400).json({ errors });
                }

                // Очистка корзины
                db.run(
                  "DELETE FROM cart WHERE userId = ?",
                  [userId],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      console.error("Ошибка при очистке корзины:", err.message);
                      return res
                        .status(500)
                        .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
                    }

                    db.run("COMMIT", (err) => {
                      if (err) {
                        db.run("ROLLBACK");
                        console.error("Ошибка при фиксации транзакции:", err.message);
                        return res
                          .status(500)
                          .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
                      }
                      res.json({
                        message: "Заказы успешно оформлены",
                        orders: insertedOrders,
                      });
                    });
                  }
                );
              }
            }
          );
        });
      });

      // Если нет заказов для проверки (все невалидны)
      if (pendingChecks === 0 && errors.length > 0) {
        db.run("ROLLBACK");
        return res.status(400).json({ errors });
      }
    });
  });

  app.get("/api/delivery", requireAuth, (req, res) => {
    const userId = req.session.user.id;
    console.log("Запрос доставок:", { userId });
    let query = "SELECT * FROM delivery";
    let params = [];
    if (req.session.user.role !== "admin") {
      query += " WHERE userId = ?";
      params.push(userId);
    }
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Ошибка при получении доставок:", err.message);
        return res
          .status(500)
          .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
      }
      res.json(rows);
    });
  });

  app.get("/api/delivery/:id", requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    console.log("Запрос доставки:", { id, userId });
    let query = "SELECT * FROM delivery WHERE id = ?";
    let params = [id];
    if (req.session.user.role !== "admin") {
      query += " AND userId = ?";
      params.push(userId);
    }
    db.get(query, params, (err, row) => {
      if (err || !row) {
        console.error("Ошибка при получении доставки:", err?.message);
        return res
          .status(404)
          .json({ error: "Доставка не найдена", code: "NOT_FOUND" });
      }
      res.json(row);
    });
  });

app.put("/api/delivery/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { userId, productId, count, date, time, status } = req.body;
  console.log("Обновление доставки:", { id, userId, productId, count, date, time, status });

  // Define allowed statuses for partial updates
  const validStatuses = ['pending', 'Можно забрать', 'Отменено'];

  // Check if only status is provided for partial update
  const isPartialUpdate = status && !userId && !productId && !count && !date && !time;

  if (isPartialUpdate) {
    // Validate status for partial update
    if (typeof status !== 'string' || !status.trim()) {
      return res
        .status(400)
        .json({ error: "Статус должен быть непустой строкой", code: "INVALID_STATUS" });
    }
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: `Статус должен быть одним из: ${validStatuses.join(', ')}`, code: "INVALID_STATUS" });
    }

    // Fetch existing delivery to ensure it exists
    db.get("SELECT id FROM delivery WHERE id = ?", [id], (err, delivery) => {
      if (err) {
        console.error("Ошибка при проверке доставки:", err.message);
        return res
          .status(500)
          .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
      }
      if (!delivery) {
        return res
          .status(404)
          .json({ error: "Доставка не найдена", code: "NOT_FOUND" });
      }

      // Update only the status
      db.run(
        "UPDATE delivery SET status = ? WHERE id = ?",
        [status, id],
        function (err) {
          if (err) {
            console.error("Ошибка при обновлении статуса доставки:", err.message);
            return res
              .status(500)
              .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
          }
          if (this.changes === 0) {
            return res
              .status(404)
              .json({ error: "Доставка не найдена", code: "NOT_FOUND" });
          }
          res.json({ message: "Статус доставки обновлен", id });
        }
      );
    });
  } else {
    // Full update: validate all fields as in original code
    if (!userId || !productId || !count || !date || !time || !status) {
      return res
        .status(400)
        .json({
          error: "Требуются userId, productId, count, date, time, status",
          code: "MISSING_FIELDS",
        });
    }
    if (isNaN(count) || count < 1) {
      return res
        .status(400)
        .json({ error: "Количество должно быть положительным", code: "INVALID_QUANTITY" });
    }

    db.get("SELECT id FROM products WHERE id = ?", [productId], (err, product) => {
      if (err || !product) {
        console.error("Ошибка при проверке продукта:", err?.message);
        return res
          .status(404)
          .json({ error: "Товар не найден", code: "PRODUCT_NOT_FOUND" });
      }

      db.get("SELECT id FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
          console.error("Ошибка при проверке пользователя:", err?.message);
          return res
            .status(404)
            .json({ error: "Пользователь не найден", code: "USER_NOT_FOUND" });
        }

        db.run(
          "UPDATE delivery SET userId = ?, productId = ?, count = ?, date = ?, time = ?, status = ? WHERE id = ?",
          [userId, productId, parseInt(count), date, time, status, id],
          function (err) {
            if (err) {
              console.error("Ошибка при обновлении доставки:", err.message);
              return res
                .status(500)
                .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
            }
            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: "Доставка не найдена", code: "NOT_FOUND" });
            }
            res.json({ message: "Доставка обновлена", id });
          }
        );
      });
    });
  }
});

  app.delete("/api/delivery/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    console.log("Удаление доставки:", { id });
    db.run(
      "DELETE FROM delivery WHERE id = ?",
      [id],
      function (err) {
        if (err) {
          console.error("Ошибка при удалении доставки:", err.message);
          return res
            .status(500)
            .json({ error: "Ошибка сервера", code: "SERVER_ERROR" });
        }
        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: "Доставка не найдена", code: "NOT_FOUND" });
        }
        res.json({ message: "Доставка удалена", changes: this.changes });
      }
    );
  });
};