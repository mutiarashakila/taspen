const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const searchPattern = `%${query}%`;

    const [results] = await db.query(`
        SELECT 
          'barang' as type,
          id_barang as id,
          nama_barang as title,
          CONCAT('/barang/', id_barang) as url,
          CONCAT('Kategori: ', COALESCE(kategori, '-'), ', Lokasi: ', COALESCE(lokasi_barang, '-'), ', Status: ', COALESCE(status_barang, '-')) as description
        FROM Barang 
        WHERE 
          LOWER(nama_barang) LIKE LOWER(?) OR 
          LOWER(id_barang) LIKE LOWER(?) OR
          LOWER(COALESCE(kategori, '')) LIKE LOWER(?) OR
          LOWER(COALESCE(lokasi_barang, '')) LIKE LOWER(?) OR
          LOWER(COALESCE(status_barang, '')) LIKE LOWER(?)
        UNION ALL
        SELECT 
          'karyawan' as type,
          id_karyawan as id,
          nama_karyawan as title,
          CONCAT('/karyawan/', id_karyawan) as url,
          CONCAT('Jabatan: ', COALESCE(jabatan, '-'), ', Status: ', COALESCE(status_karyawan, '-')) as description
        FROM Karyawan
        WHERE 
          LOWER(nama_karyawan) LIKE LOWER(?) OR
          LOWER(id_karyawan) LIKE LOWER(?) OR
          LOWER(COALESCE(jabatan, '')) LIKE LOWER(?)
        UNION ALL
        SELECT 
          'lelang' as type,
          l.id_barang as id,
          CONCAT('Lelang ', b.nama_barang) as title,
          CONCAT('/lelang/', l.id_barang) as url,
          CONCAT('Status: ', COALESCE(l.status_lelang, '-'), ', Harga: Rp', FORMAT(COALESCE(l.harga_lelang, 0), 0)) as description
        FROM Lelang l
        JOIN Barang b ON l.id_barang = b.id_barang
        WHERE 
          LOWER(l.id_barang) LIKE LOWER(?) OR
          LOWER(b.nama_barang) LIKE LOWER(?) OR
          LOWER(COALESCE(l.status_lelang, '')) LIKE LOWER(?)
        LIMIT 10
      `, Array(11).fill(searchPattern));

    res.json(results);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;