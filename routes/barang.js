const express = require('express');
const router = express.Router();
const db = require('../db'); // file untuk koneksi db

// Get All Barang
router.get('/', (req, res) => {
    let sql = 'SELECT * FROM Barang';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('barang/index', { barang: results });
    });
});

// Add Barang Page
router.get('/add', (req, res) => {
    res.render('barang/add');
});

// Add Barang (POST)
router.post('/add', (req, res) => {
    const { id_barang, nama_barang, kategori, lokasi_barang, harga_barang, status_barang } = req.body;
    let sql = `INSERT INTO Barang (id_barang, nama_barang, kategori, lokasi_barang, harga_barang, status_barang) VALUES (?, ?, ?, ?, ?, ?)`;
    let values = [id_barang, nama_barang, kategori, lokasi_barang, harga_barang, status_barang];
    db.query(sql, values, (err, result) => {
        if (err) throw err;
        res.redirect('/barang');
    });
});

// Edit Barang Page
router.get('/edit/:id', (req, res) => {
    let sql = `SELECT * FROM Barang WHERE id_barang = ?`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        res.render('barang/edit', { barang: result[0] });
    });
});

// Update Barang (POST)
router.post('/edit/:id', (req, res) => {
    const { nama_barang, kategori, lokasi_barang, harga_barang, status_barang } = req.body;
    let sql = `UPDATE Barang SET nama_barang = ?, kategori = ?, lokasi_barang = ?, harga_barang = ?, status_barang = ? WHERE id_barang = ?`;
    let values = [nama_barang, kategori, lokasi_barang, harga_barang, status_barang, req.params.id];
    db.query(sql, values, (err, result) => {
        if (err) throw err;
        res.redirect('/barang');
    });
});

// Delete Barang
router.get('/delete/:id', (req, res) => {
    let sql = `DELETE FROM Barang WHERE id_barang = ?`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) throw err;
        res.redirect('/barang');
    });
});

module.exports = router;
