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
  database: 'taspen'
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

//app.get('/dashboard', requireLogin, async (req, res) => {
  app.get('/dashboard', async (req, res) => {
  try {
    const [totalBarang] = await db.promise().query('SELECT COUNT(id_barang) as total FROM barang');
    
    const [latestItems] = await db.promise().query(`
      SELECT 
        b.id_barang,
        b.nama_barang,
        b.kategori,
        b.lokasi_barang,
        k.nama_karyawan as pemilik
      FROM 
        barang b
      LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang
      LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
      ORDER BY b.id_barang DESC LIMIT 8
    `);

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
      totalBarang: totalBarang[0].total,
      latestItems: latestItems,
      chartData: chartData,
      warningMessage: 'Ada 5 barang yang mendekati masa lelang'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function compressImage(buffer, { format = 'jpeg', quality = 80, width = 500 }) {
  return await sharp(buffer)
    .resize({ width })
    .toFormat(format, { quality })
    .toBuffer();
}
//barang
app.post('/api/barang', upload.single('gambar_barang'), async (req, res) => {
  try {
    const {
      id_barang,
      nama_barang,
      deskripsi_barang,
      kategori,
      lokasi_barang,
      harga_barang,
      status_barang,
      id_karyawan,
      waktu_mulai,
      waktu_selesai
  } = req.body;
  

    const format_harga_barang = parseInt(harga_barang.replace(/[^0-9]/g, ''), 10);

    let gambar_barang = null;

    if (req.file) {
      gambar_barang = await compressImage(req.file.buffer, {
        format: 'jpeg',
        quality: 80,
        width: 500
      });
    }

    const query = `
      INSERT INTO barang (
        id_barang, 
        nama_barang, 
        kategori, 
        lokasi_barang, 
        harga_barang, 
        status_barang, 
        deskripsi_barang,
        gambar_barang
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [id_barang, nama_barang, kategori, lokasi_barang, format_harga_barang, status_barang, deskripsi_barang, gambar_barang], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error barang' });
      } 

      // Menambahkan ke tabel kepemilikan
      const kepemilikanQuery = `
        INSERT INTO kepemilikan (id_barang, id_karyawan, tanggal_perolehan)
        VALUES (?, ?, NOW())
      `;
      db.query(kepemilikanQuery, [id_barang, id_karyawan], (kepemilikanErr, kepemilikanResult) => {
        if (kepemilikanErr) {
          console.error('Error adding to kepemilikan:', kepemilikanErr);
          return res.status(500).json({ error: 'Gagal menambahkan ke kepemilikan' });
        }

        if (status_barang === 'lelang') {
          const lelangQuery = `
              INSERT INTO lelang (id_lelang, id_barang, waktu_mulai, waktu_selesai, status_lelang)
              VALUES (UUID(), ?, ?, ?, 'aktif')
          `;
          db.query(lelangQuery, [id_barang, waktu_mulai, waktu_selesai], (lelangErr, lelangResult) => {
              if (lelangErr) {
                  console.error('Error adding to lelang:', lelangErr);
              }
          });
      }
      
        const logQuery = `
          INSERT INTO log_aktivitas (id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan)
          VALUES (UUID(), NOW(), ?, 'Tambah Barang', ?)
        `;
        const detail_perubahan = `Menambahkan barang: ${nama_barang}`;
        db.query(logQuery, [req.session.admin_id, detail_perubahan], (logErr, logResult) => {
          if (logErr) {
            console.error('Error adding to log:', logErr);
          }
        });

        res.json({ success: true, message: 'Barang dan kepemilikan berhasil ditambahkan' });
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan saat menambahkan barang' });
  }
});

app.get('/api/barang/detail/:id', async (req, res) => {
  const id_barang = req.params.id;
  try {
      const query = `
          SELECT b.id_barang, b.nama_barang, b.deskripsi_barang, 
                 b.kategori, b.lokasi_barang, b.harga_barang, 
                 b.status_barang, b.gambar_barang, 
                 k.tanggal_perolehan, 
                 kar.nama_karyawan, kar.id_karyawan,
                 l.waktu_mulai, l.waktu_selesai, l.status_lelang
          FROM barang b
          LEFT JOIN kepemilikan k ON b.id_barang = k.id_barang
          LEFT JOIN karyawan kar ON k.id_karyawan = kar.id_karyawan
          LEFT JOIN lelang l ON b.id_barang = l.id_barang
          WHERE b.id_barang = ?
      `;
      
      const [result] = await db.promise().query(query, [id_barang]);
      
      if (result.length === 0) {
          return res.json({
              success: false,
              message: 'Barang tidak ditemukan'
          });
      }
      if (result[0].gambar_barang) {
          result[0].gambar_barang = result[0].gambar_barang.toString('base64');
      }

      res.json({
          success: true,
          data: result[0]
      });
  } catch (error) {
      console.error('Error:', error);
      res.json({
          success: false,
          message: error.message
      });
  }
});

app.post('/api/barang/edit', upload.single('gambar_barang'), async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
      await connection.beginTransaction();
      
      const {
          id_barang, nama_barang, deskripsi_barang, kategori,
          lokasi_barang, harga_barang, status_barang, id_karyawan,
          waktu_mulai, waktu_selesai
      } = req.body;

      let updateBarangQuery = `
          UPDATE barang 
          SET nama_barang = ?, 
              deskripsi_barang = ?, 
              kategori = ?,
              lokasi_barang = ?, 
              harga_barang = ?, 
              status_barang = ?
      `;

      let updateBarangValues = [
          nama_barang, 
          deskripsi_barang, 
          kategori,
          lokasi_barang, 
          harga_barang, 
          status_barang
      ];

      if (req.file) {
          updateBarangQuery += `, gambar_barang = ?`;
          updateBarangValues.push(req.file.buffer);
      }

      updateBarangQuery += ` WHERE id_barang = ?`;
      updateBarangValues.push(id_barang);

      await connection.query(updateBarangQuery, updateBarangValues);
        if (id_karyawan) {
            await connection.query(
                `UPDATE kepemilikan SET id_karyawan = ? WHERE id_barang = ?`,
                [id_karyawan, id_barang]
            );
        }
        if (status_barang === 'lelang') {
            const [existingLelang] = await connection.query(
                'SELECT id_lelang FROM lelang WHERE id_barang = ?',
                [id_barang]
            );
            if (existingLelang.length > 0) {
                await connection.query(
                    `UPDATE lelang 
                     SET waktu_mulai = ?, waktu_selesai = ?
                     WHERE id_barang = ?`,
                    [waktu_mulai, waktu_selesai, id_barang]
                );
            } else {
                await connection.query(
                    `INSERT INTO lelang (id_barang, waktu_mulai, waktu_selesai, status_lelang)
                     VALUES (?, ?, ?, 'pending')`,
                    [id_barang, waktu_mulai, waktu_selesai]
                );
            }
        }
        await connection.commit();
        res.json({ success: true, message: 'Barang berhasil diupdate' });
    } catch (error) {
        await connection.rollback();
        console.error('Error:', error);
        res.json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
});



// Routes untuk fitur-fitur lain
//app.get('/barang', requireLogin, async (req, res) => {
  app.get('/barang', async (req, res) => {
    try {
        let page = req.query.page ? parseInt(req.query.page) : 1;
        let limit = 10; // Menampilkan 10 data per halaman
        let offset = (page - 1) * limit;

        // Query untuk mendapatkan total data
        const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM barang');
        let totalData = countResult[0].total;
        let totalPages = Math.ceil(totalData / limit);

        // Query untuk mendapatkan data barang dengan pagination dan join
        const [rows] = await db.promise().query(`
            SELECT 
                b.id_barang,
                b.nama_barang,
                b.kategori,
                b.lokasi_barang,
                b.status_barang,
                k.nama_karyawan,
                l.waktu_mulai,
                l.waktu_selesai,
                l.status_lelang,
                TIMESTAMPDIFF(DAY, l.waktu_mulai, l.waktu_selesai) as masa_lelang
            FROM 
                barang b
                LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang
                LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
                LEFT JOIN lelang l ON b.id_barang = l.id_barang
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Query untuk mendapatkan data karyawan
        const [karyawan] = await db.promise().query('SELECT id_karyawan, nama_karyawan FROM karyawan');

        // Render halaman dengan semua data yang diperlukan
        res.render('barang', {
            barang: rows,
            karyawan: karyawan,
            currentPage: page,
            totalPages: totalPages,
            totalData: totalData,
            limit: limit
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

  app.get('/barang/delete/:id_barang', async (req, res) => {
    const id_barang = req.params.id_barang;
  
    try {
      await db.promise().query('START TRANSACTION');
      await db.promise().query('DELETE FROM lelang WHERE id_barang = ?', [id_barang]);
      await db.promise().query('DELETE FROM kepemilikan WHERE id_barang = ?', [id_barang]);
      await db.promise().query('DELETE FROM barang WHERE id_barang = ?', [id_barang]);
      await db.promise().query('COMMIT');
  
      const logQuery = `
        INSERT INTO log_aktivitas (id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan)
        VALUES (UUID(), NOW(), ?, 'Hapus Barang', ?)
      `;
      const detail_perubahan = `Menghapus barang dengan ID: ${id_barang}`;
      await db.promise().query(logQuery, [req.session.email, detail_perubahan]);
  
      res.redirect('/barang');
    } catch (error) {
      await db.promise().query('ROLLBACK');
      console.error('Error during deletion:', error);
      res.status(500).send('Gagal menghapus barang');
    }
  });

  
  //app.get('/mutasi', requireLogin, async (req, res) => {
  app.get('/mutasi', async (req, res) => {
    try {
      const lelangQuery = `SELECT nama_barang FROM barang WHERE status_barang = 'lelang'`;
      
      const jualQuery = `SELECT nama_barang FROM barang WHERE status_barang = 'jual'`;
  
      const [barangLelang] = await db.promise().query(lelangQuery);
      const [barangJual] = await db.promise().query(jualQuery);
  
      res.render('mutasi', {
        barangLelang: barangLelang,
        barangJual: barangJual
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Terjadi kesalahan database');
    }
  });

  app.get('/karyawan', async (req, res) => {
    try {
      const [rows] = await db.promise().query(`
        SELECT id_karyawan, nama_karyawan, jabatan, status_karyawan FROM karyawan`);
  
      const [karyawan] = await db.promise().query('SELECT id_karyawan, nama_karyawan FROM karyawan');
  
      res.render('karyawan', { karyawan: rows});
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Terjadi kesalahan database');
    }
  });

//app.get('/lelang', requireLogin, (req, res) => {
  app.get('/lelang', (req, res) => {
  res.render('lelang');
});

app.get('/login', (req, res) => {
  res.render('login');
});


app.get('/pemilik', /*requireLogin,*/ (req, res) => {
  res.render('pemilik');
});

app.get('/profil', /*requireLogin,*/ (req, res) => {
  res.render('profil');
});

app.get('/pengaturan', /*requireLogin,*/ (req, res) => {
  res.render('try');
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;