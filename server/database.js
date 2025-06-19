const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к базе данных SQLite');
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'user',
                username TEXT NOT NULL
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                miscellaneous TEXT,
                price REAL,
                lastPrice REAL,
                imageLogo BLOB,
                firmName TEXT,
                soldQuantity INTEGER DEFAULT 0,
                manufacturingYear INTEGER
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                productId INTEGER,
                userId INTEGER,
                comment TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(productId) REFERENCES products(id),
                FOREIGN KEY(userId) REFERENCES users(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                productId INTEGER,
                userId INTEGER,
                rating INTEGER CHECK(rating >= 1 AND rating <= 5),
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(productId, userId),
                FOREIGN KEY(productId) REFERENCES products(id),
                FOREIGN KEY(userId) REFERENCES users(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                productId INTEGER,
                image BLOB,
                FOREIGN KEY(productId) REFERENCES products(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                productId INTEGER,
                UNIQUE(userId, productId),
                FOREIGN KEY(userId) REFERENCES users(id),
                FOREIGN KEY(productId) REFERENCES products(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS cart (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                productId INTEGER,
                quantity INTEGER,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (productId) REFERENCES products(id),
                UNIQUE(userId, productId)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS delivery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                productId INTEGER,
                count INTEGER NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES users(id),
                FOREIGN KEY (productId) REFERENCES products(id)
            )
        `);
    });
}

initializeDatabase();

module.exports = db;