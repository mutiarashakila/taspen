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

const db = require('./db');
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
  res.locals.url = req.originalUrl; // atau req.path
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.post('/api/dev/speed-up-time', async (req, res) => {
      const days = req.body.days || 30; // Default 30 hari
      await speedUpTime(pool, days);
      res.json({ message: 'Time accelerated for testing' });
  });
}

const requireLogin = (req, res, next) => {
  if (req.session.email) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes untuk autentikasi
/*app.get('/', (req, res) => {
  if (req.session.email) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { title: 'Login' });
  }
});*/

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email);

  const sql = 'SELECT * FROM admin WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ success: false, message: 'Terjadi kesalahan sistem' });
    }

    if (results.length > 0) {
      const hashedPassword = results[0].password;

      bcrypt.compare(password, hashedPassword, (err, isMatch) => {
        if (err) {
          console.error('Bcrypt error:', err);
          return res.json({ success: false, message: 'Terjadi kesalahan sistem' });
        }

        if (isMatch) {
          req.session.email = email;
          res.json({ success: true, message: 'Login berhasil' });
        } else {
          res.json({ success: false, message: 'Email atau password salah' });
        }
      });
    } else {
      res.json({ success: false, message: 'Email atau password salah' });
    }
  });
});

const notificationRoutes = require('./routes/notification');
app.use('/notifications', notificationRoutes(notificationService));

const dashboardRouter = require('./routes/dashboard');
app.use('/dashboard', dashboardRouter);

const barangrouter = require('./routes/barang');
app.use('/barang', barangrouter);

const karyawanrouter = require('./routes/karyawan');
app.use('/karyawan', karyawanrouter);

const pemilikrouter = require('./routes/pemilik');
app.use('/pemilik', pemilikrouter);

const logadminrouter = require('./routes/logadmin');
app.use('/logadmin', logadminrouter);

const searchrouter = require('./routes/search');
app.use('/search', searchrouter);

const lelangrouter = require('./routes/lelang');
app.use('/lelang', lelangrouter);

const profilroutes = require('./routes/profil');
app.use('/profil', profilroutes);



app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/profil', /*requireLogin,*/(req, res) => {
  res.render('profil');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;