const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require('bcryptjs'); // Menggunakan bcryptjs konsisten
const sharp = require('sharp');

const app = express();

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'inventas'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to database');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Middleware untuk pengecekan login
const requireLogin = (req, res, next) => {
  if (req.session.email) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes untuk autentikasi
app.get('/', (req, res) => {
  if (req.session.email) {
    res.redirect('/dashboard');
  } else {
    res.render('login', { title: 'Login' });
  }
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

// Routes untuk halaman
app.get('/dashboard', requireLogin, (req, res) => {
  const chartData = {
    type: 'doughnut',
    data: {
      labels: ['Tersedia', 'Akan Lelang', 'Sudah Lelang'],
      datasets: [{
        data: [55, 30, 15],
        backgroundColor: [
          'rgb(78, 115, 223)',
          'rgb(28, 200, 138)',
          'rgb(54, 185, 204)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      cutout: '80%'
    }
  };

  res.render('dashboard', {
    title: 'Dashboard',
    chartData: chartData,
    latestItems: [],
    warningMessage: 'Ada 5 barang yang mendekati masa lelang'
  });
});

// Routes untuk fitur-fitur lain
app.get('/barang', requireLogin, async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT 
        b.id_barang,
        b.nama_barang,
        b.kategori,
        b.lokasi_barang,
        k.nama_karyawan,
        l.waktu_mulai,
        l.waktu_selesai,
        l.status_lelang,
        TIMESTAMPDIFF(YEAR, l.waktu_mulai, l.waktu_selesai) as masa_lelang
      FROM 
        barang b
        LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang
        LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
        LEFT JOIN lelang l ON b.id_barang = l.id_barang
    `);
    
    res.render('barang', { barang: rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/lelang', requireLogin, (req, res) => {
  res.render('lelang');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/mutasi', requireLogin, (req, res) => {
  res.render('mutasi');
});

app.get('/pemilik', requireLogin, (req, res) => {
  res.render('pemilik');
});

app.get('/profil', requireLogin, (req, res) => {
  res.render('profil');
});

// Route untuk delete barang
app.delete('delete/:id', requireLogin, async (req, res) => {
  const connection = await db.promise();
  try {
    await connection.beginTransaction();
    
    await connection.query('DELETE FROM lelang WHERE id_barang = ?', [req.params.id]);
    await connection.query('DELETE FROM kepemilikan WHERE id_barang = ?', [req.params.id]);
    await connection.query('DELETE FROM barang WHERE id_barang = ?', [req.params.id]);
    
    await connection.commit();
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error) {
    await connection.rollback();
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Gagal menghapus data' });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;