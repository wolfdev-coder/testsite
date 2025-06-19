//server-middleware.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const crypto = require('crypto');

module.exports = {
  setupMiddleware: (app) => {
    app.use(cors({
      origin: 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use('/css', express.static(path.join(__dirname, '../css')));
    app.use('/img', express.static(path.join(__dirname, '../img')));
    app.use('/js', express.static(path.join(__dirname, '../js')));
    app.use('/Uploads', express.static(path.join(__dirname, '../Uploads')));
    app.use(express.static(path.join(__dirname, '..')));

    app.use(
      session({
        store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
        secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
        resave: false,
        saveUninitialized: false,
        cookie: {
          maxAge: 7 * 24 * 60 * 60 * 1000,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          httpOnly: true
        }
      })
    );

    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Session: ${JSON.stringify(req.session.user)}`);
      next();
    });
  },

  requireAuth: (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Требуется авторизация', code: 'UNAUTHORIZED' });
    }
    next();
  },

  requireAdmin: (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещен', code: 'FORBIDDEN' });
    }
    next();
  }
};