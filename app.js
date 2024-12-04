const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const { initNotificationSystem } = require('./public/js/modules/notification-service');

const app = express();

const db = require('./db')
const notificationService = initNotificationSystem(db);



app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));
app.use((req, res, next) => {
  res.locals.url = req.originalUrl;
  res.locals.admin = req.session.admin;
  next();
});

app.get('/', (req, res) => {
  if (req.session.email) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

const getAdminData = async (req, res, next) => {
  if (req.session.email) {
      try {
          const [adminRows] = await db.query(
              'SELECT id_admin, username, foto FROM Admin WHERE email = ?', 
              [req.session.email]
          );
          
          if (adminRows.length > 0) {
              res.locals.adminData = adminRows[0];
          }
      } catch (error) {
          console.error('Error fetching admin data:', error);
      }
  }
  next();
};

const login = require('./routes/login');
const notification = require('./routes/notification');
const dashboard = require('./routes/dashboard');
const barang = require('./routes/barang');
const karyawan = require('./routes/karyawan');
const pemilik = require('./routes/pemilik');
const logadmin = require('./routes/logadmin');
const search = require('./routes/search');
const lelang = require('./routes/lelang');
const profil = require('./routes/profil');
const laporan = require('./routes/laporan');
const penjualan = require('./routes/penjualan');
const jual = require('./routes/jual');
const riwayat_notifikasi = require('./routes/riwayat_notifikasi');

app.use(getAdminData);
app.use('/login', login);
app.use('/notifications', notification(notificationService));
app.use('/dashboard', dashboard);
app.use('/barang', barang);
app.use('/karyawan', karyawan);
app.use('/pemilik', pemilik);
app.use('/logadmin', logadmin);
app.use('/search', search);
app.use('/lelang', lelang);
app.use('/profil', profil);
app.use('/laporan', laporan);
app.use('/penjualan', penjualan);
app.use('/jual', jual);
app.use('/r_notif', riwayat_notifikasi);

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return res.status(500).json({ message: 'Logout failed, please try again.' });
      }
      res.clearCookie('sessionId');
      res.redirect('/login');
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;