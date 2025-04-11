const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db.js');

router.get('/', (req, res) => {
  if (req.session.email) {
    res.redirect('/dashboard');
  }
  res.render('login', { title: 'Login', error: null });
});

router.post('/', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email);

  try {
    const [rows] = await db.query(
        'SELECT * from users WHERE email = ?' ,
        [email]
      );

    if (rows.length === 0) {
      console.log('Login failed: User not found');
      return res.json({ success: false, message: 'Email atau password salah' });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
      console.log('Login failed: Password incorrect');
      return res.json({ success: false, message: 'Email atau password salah' });
    }

    req.session.email = email;
    req.session.userId = rows[0].id_user;
    console.log('Login successful for:', email);
    res.json({ success: true, message: 'Login berhasil' });

  } catch (error) {
    console.error('Login error:', error);
    res.json({ success: false, message: 'Terjadi kesalahan sistem' });
  }
});

module.exports = router;