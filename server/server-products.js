//server-products.js
const multer = require('multer');
const { requireAdmin } = require('./server-middleware');

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype) return cb(null, true);
        cb(new Error('Только изображения формата JPEG или PNG'));
    },
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = (app, db) => {
    // Проверка существования таблиц
    db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="products"', (err, row) => {
        if (err || !row) {
            console.error('Таблица products не существует');
            throw new Error('Таблица products не существует');
        }
    });

    db.get('SELECT name FROM sqlite_master WHERE type="table" AND name="photos"', (err, row) => {
        if (err || !row) {
            console.error('Таблица photos не существует');
            throw new Error('Таблица photos не существует');
        }
    });

    app.get('/api/products', (req, res) => {
        console.log('GET /api/products called');
        db.all('SELECT * FROM products', [], (err, rows) => {
            if (err) {
                console.error('Ошибка при получении продуктов:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            console.log('Products retrieved:', rows.length);
            const products = rows.map(row => ({
                ...row,
                imageLogo: row.imageLogo ? Buffer.from(row.imageLogo).toString('base64') : null,
                price: parseFloat(row.price) || 0,
                lastPrice: row.lastPrice ? parseFloat(row.lastPrice) : null,
                soldQuantity: parseInt(row.soldQuantity) || 0,
                manufacturingYear: row.manufacturingYear ? parseInt(row.manufacturingYear) : null
            }));
            res.json(products);
        });
    });

    app.get('/api/products/:id', (req, res) => {
        const { id } = req.params;
        console.log(`GET /api/products/${id} called`);
        db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Ошибка при получении продукта:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            if (!row) {
                console.log(`Продукт с ID ${id} не найден`);
                return res.status(404).json({ error: 'Продукт не найден', code: 'NOT_FOUND' });
            }
            res.json({
                ...row,
                imageLogo: row.imageLogo ? Buffer.from(row.imageLogo).toString('base64') : null,
                price: parseFloat(row.price) || 0,
                lastPrice: row.lastPrice ? parseFloat(row.lastPrice) : null,
                soldQuantity: parseInt(row.soldQuantity) || 0,
                manufacturingYear: row.manufacturingYear ? parseInt(row.manufacturingYear) : null
            });
        });
    });

    app.get('/api/photos', (req, res) => {
        const { productId } = req.query;
        console.log(`GET /api/photos called, productId: ${productId || 'all'}`);
        let query = 'SELECT * FROM photos';
        let params = [];
        
        if (productId) {
            query += ' WHERE productId = ?';
            params.push(productId);
        }

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Ошибка при получении фотографий:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            console.log('Photos retrieved:', rows.length);
            const photos = rows.map(row => ({
                ...row,
                image: row.image ? Buffer.from(row.image).toString('base64') : null
            }));
            res.json(photos);
        });
    });

    app.post(
        '/api/products',
        requireAdmin,
        upload.fields([
            { name: 'imageLogo', maxCount: 1 },
            { name: 'photos', maxCount: 5 }
        ]),
        (req, res) => {
            const data = req.body;
            console.log('POST /api/products:', data, 'Files:', req.files);
            if (!data.name || !data.price) {
                return res.status(400).json({ error: 'Требуются name и price', code: 'MISSING_FIELDS' });
            }
            data.price = parseFloat(data.price) || 0;
            data.lastPrice = data.lastPrice ? parseFloat(data.lastPrice) : null;
            data.soldQuantity = parseInt(data.soldQuantity) || 0;
            data.manufacturingYear = data.manufacturingYear ? parseInt(data.manufacturingYear) : null;
            data.miscellaneous = data.miscellaneous || null;
            data.firmName = data.firmName || null;
            data.imageLogo = req.files?.imageLogo?.[0]?.buffer || null;

            const keys = ['name', 'miscellaneous', 'price', 'lastPrice', 'imageLogo', 'firmName', 'soldQuantity', 'manufacturingYear'];
            const values = keys.map(k => data[k]);
            db.run(
                `INSERT INTO products (${keys.join(',')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                values,
                function (err) {
                    if (err) {
                        console.error('Ошибка при добавлении продукта:', err.message);
                        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
                    }
                    const productId = this.lastID;
                    if (req.files?.photos?.length > 0) {
                        const photoInserts = req.files.photos.map(photo => {
                            return new Promise((resolve, reject) => {
                                db.run(
                                    'INSERT INTO photos (productId, image) VALUES (?, ?)',
                                    [productId, photo.buffer],
                                    err => err ? reject(err) : resolve()
                                );
                            });
                        });
                        Promise.all(photoInserts)
                            .then(() => res.json({ id: productId, ...data }))
                            .catch(err => {
                                console.error('Ошибка при добавлении фотографий:', err.message);
                                res.status(500).json({ error: 'Ошибка при добавлении фотографий', code: 'PHOTO_UPLOAD_ERROR' });
                            });
                    } else {
                        res.json({ id: productId, ...data });
                    }
                }
            );
        }
    );

    app.put(
        '/api/products/:id',
        requireAdmin,
        upload.fields([
            { name: 'imageLogo', maxCount: 1 },
            { name: 'photos', maxCount: 5 }
        ]),
        (req, res) => {
            const { id } = req.params;
            const data = req.body;
            console.log(`PUT /api/products/${id}:`, data, 'Files:', req.files);
            if (!data.name || !data.price) {
                return res.status(400).json({ error: 'Требуются name и price', code: 'MISSING_FIELDS' });
            }
            data.price = parseFloat(data.price) || 0;
            data.lastPrice = data.lastPrice ? parseFloat(data.lastPrice) : null;
            data.soldQuantity = parseInt(data.soldQuantity) || 0;
            data.manufacturingYear = data.manufacturingYear ? parseInt(data.manufacturingYear) : null;
            data.miscellaneous = data.miscellaneous || null;
            data.firmName = data.firmName || null;
            data.imageLogo = req.files?.imageLogo?.[0]?.buffer || null;

            const keys = ['name', 'miscellaneous', 'price', 'lastPrice', 'imageLogo', 'firmName', 'soldQuantity', 'manufacturingYear'];
            const fields = keys.map(key => `${key} = ?`).join(',');
            const values = keys.map(k => data[k]).concat(id);
            db.run(
                `UPDATE products SET ${fields} WHERE id = ?`,
                values,
                function (err) {
                    if (err) {
                        console.error('Ошибка при обновлении продукта:', err.message);
                        return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
                    }
                    if (this.changes === 0) {
                        console.log(`Продукт с ID ${id} не найден`);
                        return res.status(404).json({ error: 'Продукт не найден', code: 'NOT_FOUND' });
                    }
                    if (req.files?.photos?.length > 0) {
                        db.run('DELETE FROM photos WHERE productId = ?', [id], err => {
                            if (err) {
                                console.error('Ошибка при удалении старых фотографий:', err.message);
                                return res.status(500).json({ error: 'Ошибка при удалении фотографий', code: 'PHOTO_DELETE_ERROR' });
                            }
                            const photoInserts = req.files.photos.map(photo => {
                                return new Promise((resolve, reject) => {
                                    db.run(
                                        'INSERT INTO photos (productId, image) VALUES (?, ?)',
                                        [id, photo.buffer],
                                        err => err ? reject(err) : resolve()
                                    );
                                });
                            });
                            Promise.all(photoInserts)
                                .then(() => res.json({ message: 'Продукт обновлен', id }))
                                .catch(err => {
                                    console.error('Ошибка при добавлении фотографий:', err.message);
                                    res.status(500).json({ error: 'Ошибка при добавлении фотографий', code: 'PHOTO_UPLOAD_ERROR' });
                                });
                        });
                    } else {
                        res.json({ message: 'Продукт обновлен', id });
                    }
                }
            );
        }
    );

    app.delete('/api/products/:id', requireAdmin, (req, res) => {
        const { id } = req.params;
        console.log(`DELETE /api/products/${id}`);
        db.run('DELETE FROM photos WHERE productId = ?', [id], err => {
            if (err) {
                console.error('Ошибка при удалении фотографий:', err.message);
                return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
            }
            db.run('DELETE FROM products WHERE id = ?', [id], function (err) {
                if (err) {
                    console.error('Ошибка при удалении продукта:', err.message);
                    return res.status(500).json({ error: 'Ошибка сервера', code: 'SERVER_ERROR' });
                }
                if (this.changes === 0) {
                    console.log(`Продукт с ID ${id} не найден`);
                    return res.status(404).json({ error: 'Продукт не найден', code: 'NOT_FOUND' });
                }
                res.json({ message: 'Продукт успешно удален', changes: this.changes });
            });
        });
    });
};