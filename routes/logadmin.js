const express = require('express');
const router = express.Router();
const db = require('../db.js');

router.get('/', async (req, res) => {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let limit = 10;
  let offset = (page - 1) * limit;

  try {
    const [countResult] = await db.query('SELECT COUNT(*) AS total FROM log_aktivitas');
    let totalData = countResult[0].total;
    let totalPages = Math.ceil(totalData / limit);

    const [log] = await db.query(`
        SELECT timestamp, id_admin, jenis_aktivitas, detail_perubahan 
        FROM log_aktivitas 
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `, [limit, offset]);

    res.render('logadmin', {
      log,
      currentPage: page,
      totalPages: totalPages,
      totalData: totalData,
      limit: limit
    });

  } catch (err) {
    console.error('Error fetching admin logs:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;