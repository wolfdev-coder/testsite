//server-auth.js
const bcrypt = require('bcrypt');
const { requireAuth } = require('./server-middleware');

module.exports = (app, db) => {
  app.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword, role = 'user' } = req.body;
    console.log('Регистрация:', { username, email, role });

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Все поля обязательны', code: 'MISSING_FIELDS' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Пароли не совпадают', code: 'PASSWORD_MISMATCH' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 8 символов', code: 'INVALID_PASSWORD_LENGTH' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email', code: 'INVALID_EMAIL' });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [username.trim(), email.trim(), hashedPassword, role],
        function (err) {
          if (err) {
            console.error('Ошибка при регистрации:', err.message);
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Email уже зарегистрирован', code: 'EMAIL_EXISTS' });
            }
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          const user = { id: this.lastID, username, email, role };
          req.session.user = user;
          req.session.save(err => {
            if (err) {
              console.error('Ошибка сохранения сессии:', err);
              return res.status(500).json({ error: 'Ошибка сохранения сессии', code: 'SESSION_ERROR' });
            }
            res.json({ message: 'Регистрация успешна', user });
          });
        }
      );
    } catch (err) {
      console.error('Ошибка хеширования пароля:', err.message);
      res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
    }
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Вход:', { email });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны', code: 'MISSING_FIELDS' });
    }

    try {
      db.get('SELECT * FROM users WHERE email = ?', [email.trim()], async (err, user) => {
        if (err) {
          console.error('Ошибка при поиске пользователя:', err.message);
          return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
        }
        if (!user) {
          return res.status(400).json({ error: 'Неверный email или пароль', code: 'INVALID_CREDENTIALS' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ error: 'Неверный email или пароль', code: 'INVALID_CREDENTIALS' });
        }
        req.session.user = { id: user.id, username: user.username, email: user.email, role: user.role };
        req.session.save(err => {
          if (err) {
            console.error('Ошибка сохранения сессии:', err);
            return res.status(500).json({ error: 'Ошибка сохранения сессии', code: 'SESSION_ERROR' });
          }
          res.json({ message: 'Вход успешен', user: req.session.user });
        });
      });
    } catch (err) {
      console.error('Ошибка при входе:', err.message);
      res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
    }
  });

  app.post('/logout', (req, res) => {
    console.log('Выход:', req.session.user);
    req.session.destroy(err => {
      if (err) {
        console.error('Ошибка при выходе:', err.message);
        return res.status(500).json({ error: 'Ошибка при выходе', code: 'SESSION_ERROR' });
      }
      res.json({ message: 'Выход успешен' });
    });
  });

  app.get('/auth/status', (req, res) => {
    console.log('Проверка статуса:', req.session.user);
    if (req.session.user) {
      res.json({ isAuthenticated: true, user: req.session.user });
    } else {
      res.json({ isAuthenticated: false });
    }
  });

  app.get('/api/users/me', requireAuth, (req, res) => {
    const user = req.session.user;
    console.log('Запрос данных пользователя:', user);
    db.get('SELECT id, username, email, role FROM users WHERE id = ?', [user.id], (err, row) => {
      if (err || !row) {
        console.error('Ошибка при загрузке данных пользователя:', err?.message);
        return res.status(500).json({ error: 'Ошибка при загрузке данных', code: 'SERVER_ERROR' });
      }
      res.json(row);
    });
  });

  app.put('/api/users/me', requireAuth, async (req, res) => {
    const { username, email } = req.body;
    const userId = req.session.user.id;
    console.log('Обновление профиля:', { username, email, userId });

    if (!username || !email) {
      return res.status(400).json({ error: 'Имя и email обязательны', code: 'MISSING_FIELDS' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email', code: 'INVALID_EMAIL' });
    }

    try {
      db.run(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username.trim(), email.trim(), userId],
        function (err) {
          if (err) {
            console.error('Ошибка при обновлении профиля:', err.message);
            if (err.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Email уже зарегистрирован', code: 'EMAIL_EXISTS' });
            }
            return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
          }
          req.session.user = { ...req.session.user, username, email };
          req.session.save(err => {
            if (err) {
              console.error('Ошибка сохранения сессии:', err);
              return res.status(500).json({ error: 'Ошибка сохранения сессии', code: 'SESSION_ERROR' });
            }
            res.json({ message: 'Профиль успешно обновлен', user: { id: userId, username, email, role: req.session.user.role } });
          });
        }
      );
    } catch (err) {
      console.error('Ошибка при обновлении профиля:', err);
      res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
    }
  });

  app.post('/api/users/me/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;
    console.log('Смена пароля:', { userId });

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Требуются текущий и новый пароль', code: 'MISSING_FIELDS' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Новый пароль должен быть не менее 8 символов', code: 'INVALID_PASSWORD_LENGTH' });
    }

    try {
      db.get('SELECT password FROM users WHERE id = ?', [userId], async (err, user) => {
        if (err || !user) {
          console.error('Ошибка при поиске пользователя:', err?.message);
          return res.status(404).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
        }
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          return res.status(400).json({ error: 'Неверный текущий пароль', code: 'INVALID_CURRENT_PASSWORD' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, userId],
          function (err) {
            if (err) {
              console.error('Ошибка при смене пароля:', err);
              return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            res.json({ message: 'Пароль успешно изменён' });
          }
        );
      });
    } catch (err) {
      console.error('Ошибка при смене пароля:', err);
      res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
    }
  });
};