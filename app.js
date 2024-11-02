const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require('bcryptjs');
const sharp = require('sharp');

const app = express();

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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

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

      const kepemilikanQuery = `
INSERT INTO kepemilikan (id_barang, id_karyawan, tanggal_perolehan, status_kepemilikan)
VALUES (?, ?, NOW(), 'aktif')
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
          LEFT JOIN kepemilikan k ON b.id_barang = k.id_barang AND k.status_kepemilikan = 'aktif'
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

    if (!id_barang || !nama_barang) {
      return res.status(400).json({
        success: false,
        message: 'ID Barang dan Nama Barang wajib diisi'
      });
    }

    const format_harga_barang = parseInt(harga_barang.replace(/[^0-9]/g, ''), 10);
    if (isNaN(format_harga_barang)) {
      return res.status(400).json({
        success: false,
        message: 'Format harga tidak valid'
      });
    }

    let gambar_barang = null;
    if (req.file) {
      gambar_barang = await compressImage(req.file.buffer, {
        format: 'jpeg',
        quality: 80,
        width: 500
      });
    }

    db.beginTransaction(async (err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan saat memulai transaksi'
        });
      }

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
        format_harga_barang,
        status_barang
      ];

      if (gambar_barang) {
        updateBarangQuery += ', gambar_barang = ?';
        updateBarangValues.push(gambar_barang);
      }

      updateBarangQuery += ' WHERE id_barang = ?';
      updateBarangValues.push(id_barang);

      db.query(updateBarangQuery, updateBarangValues, (updateErr, updateResult) => {
        if (updateErr) {
          return db.rollback(() => {
            console.error('Error updating barang:', updateErr);
            res.status(500).json({
              success: false,
              message: 'Gagal mengupdate barang'
            });
          });
        }

        if (updateResult.affectedRows === 0) {
          return db.rollback(() => {
            res.status(404).json({
              success: false,
              message: 'Barang tidak ditemukan'
            });
          });
        }

        const updateKepemilikanQuery = `
        UPDATE kepemilikan
        SET status_kepemilikan = 'tidak aktif'
        WHERE id_barang = ? AND status_kepemilikan = 'aktif'
      `;
        db.query(updateKepemilikanQuery, [id_barang], (updateKepemilikanErr) => {
          if (updateKepemilikanErr) {
            return db.rollback(() => {
              console.error('Error updating kepemilikan:', updateKepemilikanErr);
              res.status(500).json({
                success: false,
                message: 'Gagal mengubah status kepemilikan'
              });
            });
          }
        })

        if (id_karyawan) {
          const newKepemilikanQuery = `
            INSERT INTO kepemilikan (id_barang, id_karyawan, tanggal_perolehan, status_kepemilikan)
            VALUES (?, ?, NOW(), 'aktif')
          `;
          db.query(newKepemilikanQuery, [id_barang, id_karyawan], (newKepemilikanErr) => {
            if (newKepemilikanErr) {
              return db.rollback(() => {
                console.error('Error adding new kepemilikan:', newKepemilikanErr);
                res.status(500).json({
                  success: false,
                  message: 'Gagal menambahkan kepemilikan baru'
                });
              });
            }

            const logQuery = `
                                  INSERT INTO log_aktivitas(id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan)
                                  VALUES (UUID(), NOW(), ?, 'Edit Barang', ?)
                              `;
            const detail_perubahan = `Mengubah barang: ${nama_barang}`;

            db.query(logQuery, [req.session.admin_id, detail_perubahan], (logErr) => {
              if (logErr) {
                return db.rollback(() => {
                  console.error('Error adding log:', logErr);
                  res.status(500).json({
                    success: false,
                    message: 'Gagal menambahkan log'
                  });
                });
              }
            })

            if (status_barang === 'lelang') {
              if (!waktu_mulai || !waktu_selesai) {
                return db.rollback(() => {
                  res.status(400).json({
                    success: false,
                    message: 'Waktu lelang harus diisi'
                  });
                });
              }

              const lelangQuery = `
                              INSERT INTO lelang (id_lelang, id_barang, waktu_mulai, waktu_selesai, status_lelang)
                              VALUES (UUID(), ?, ?, ?, 'aktif')
                              ON DUPLICATE KEY UPDATE
                              waktu_mulai = VALUES(waktu_mulai),
                              waktu_selesai = VALUES(waktu_selesai)
                          `;
              db.query(lelangQuery, [id_barang, waktu_mulai, waktu_selesai], (lelangErr) => {
                if (lelangErr) {
                  return db.rollback(() => {
                    console.error('Error updating lelang:', lelangErr);
                    res.status(500).json({
                      success: false,
                      message: 'Gagal mengupdate lelang'
                    });
                  });
                }

                db.commit((commitErr) => {
                  if (commitErr) {
                    return db.rollback(() => {
                      console.error('Error committing transaction:', commitErr);
                      res.status(500).json({
                        success: false,
                        message: 'Gagal menyimpan perubahan'
                      });
                    });
                  }

                  res.json({
                    success: true,
                    message: 'Barang berhasil diperbarui',
                    data: { id_barang }
                  });
                });
                ;
              });
            } else {
              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() => {
                    console.error('Error committing transaction:', commitErr);
                    res.status(500).json({
                      success: false,
                      message: 'Gagal menyimpan perubahan'
                    });
                  });
                }

                res.json({
                  success: true,
                  message: 'Barang berhasil diperbarui',
                  data: { id_barang }
                });
              });
            }
          });
        } else {
          db.commit((commitErr) => {
            if (commitErr) {
              return db.rollback(() => {
                console.error('Error committing transaction:', commitErr);
                res.status(500).json({
                  success: false,
                  message: 'Gagal menyimpan perubahan'
                });
              });
            }

            res.json({
              success: true,
              message: 'Barang berhasil diperbarui',
              data: { id_barang }
            });
          });
        }
      });
    });

  } catch (error) {
    console.error('Error updating barang:', error);
    res.status(500).json({
      success: false,
    });
  }
});

app.get('/api/barang/refresh', async (req, res) => {
  try {
    let page = req.query.page ? parseInt(req.query.page) : 1;
    let limit = 10;
    let offset = (page - 1) * limit;
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM barang');
    let totalData = countResult[0].total;
    let totalPages = Math.ceil(totalData / limit);
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
          CONCAT(
            TIMESTAMPDIFF(DAY, l.waktu_mulai, l.waktu_selesai), 'h',
            MOD(TIMESTAMPDIFF(HOUR, l.waktu_mulai, l.waktu_selesai), 24), 'j',
            MOD(TIMESTAMPDIFF(MINUTE, l.waktu_mulai, l.waktu_selesai), 60), 'm',
            MOD(TIMESTAMPDIFF(SECOND, l.waktu_mulai, l.waktu_selesai), 60), 'd'
          ) as masa_lelang
      FROM 
          barang b
                          LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang AND kp.status_kepemilikan = 'aktif'
          LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
          LEFT JOIN lelang l ON b.id_barang = l.id_barang
      LIMIT ? OFFSET ?
    `, [limit, offset]);


    res.json({
      success: true,
      barang: rows,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
});

const updatedItems = new Map();

//app.get('/barang', requireLogin, async (req, res) => {
app.get('/barang', async (req, res) => {
  try {
    let page = req.query.page ? parseInt(req.query.page) : 1;
    let limit = 10;
    let offset = (page - 1) * limit;
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM barang');
    let totalData = countResult[0].total;
    let totalPages = Math.ceil(totalData / limit);
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
            CONCAT(
              TIMESTAMPDIFF(DAY, l.waktu_mulai, l.waktu_selesai), 'h',
              MOD(TIMESTAMPDIFF(HOUR, l.waktu_mulai, l.waktu_selesai), 24), 'j',
              MOD(TIMESTAMPDIFF(MINUTE, l.waktu_mulai, l.waktu_selesai), 60), 'm',
              MOD(TIMESTAMPDIFF(SECOND, l.waktu_mulai, l.waktu_selesai), 60), 'd'
            ) as masa_lelang
        FROM 
            barang b
                            LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang AND kp.status_kepemilikan = 'aktif'
            LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
            LEFT JOIN lelang l ON b.id_barang = l.id_barang
        LIMIT ? OFFSET ?
      `, [limit, offset]);

    console.log('Rows fetched:', rows);

    const processedRows = rows.map(row => {
      console.log('Individual Row:', row);
      const updatedItem = updatedItems.get(row.id_barang);
      return updatedItem || row;
    });

    const [karyawan] = await db.promise().query('SELECT id_karyawan, nama_karyawan FROM karyawan');
    res.render('barang', {
      barang: processedRows,
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

    const [barangResult] = await db.promise().query(
      'SELECT nama_barang FROM barang WHERE id_barang = ?',
      [id_barang]
    );

    if (!barangResult || barangResult.length === 0) {
      await db.promise().query('ROLLBACK');
      return res.status(404).send('Barang tidak ditemukan');
    }

    const nama_barang = barangResult[0].nama_barang;

    await db.promise().query('DELETE FROM lelang WHERE id_barang = ?', [id_barang]);
    await db.promise().query('DELETE FROM kepemilikan WHERE id_barang = ?', [id_barang]);
    await db.promise().query('DELETE FROM barang WHERE id_barang = ?', [id_barang]);

    const logQuery = `
      INSERT INTO log_aktivitas (id_log, timestamp, id_admin, jenis_aktivitas, detail_perubahan)
      VALUES (UUID(), NOW(), ?, 'Hapus Barang', ?)
    `;
    const detail_perubahan = `Menghapus barang : ${nama_barang}`;
    await db.promise().query(logQuery, [req.session.email, detail_perubahan]);

    await db.promise().query('COMMIT');
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
      
      // Query untuk barang dengan lebih dari 1 pemilik
      const pindahNamaPemilikQuery = `
        SELECT b.nama_barang, COUNT(k.id_karyawan) AS jumlah_pindah
        FROM Kepemilikan k
        JOIN Barang b ON k.id_barang = b.id_barang
        GROUP BY b.id_barang
        HAVING jumlah_pindah > 1;
      `;
  
      const [barangLelang] = await db.promise().query(lelangQuery);
      const [barangJual] = await db.promise().query(jualQuery);
      const [barangPindahNama] = await db.promise().query(pindahNamaPemilikQuery);
  
      res.render('mutasi', {
        barangLelang,
        barangJual,
        barangPindahNama
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Terjadi kesalahan database');
    }
  });
  

app.get('/karyawan', async (req, res) => {
  let page = req.query.page ? parseInt(req.query.page) : 1;
  let limit = 10;
  let offset = (page - 1) * limit;
  const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM karyawan');
  let totalData = countResult[0].total;
  let totalPages = Math.ceil(totalData / limit);
  try {
    const [rows] = await db.promise().query(`
        SELECT id_karyawan, nama_karyawan, jabatan, jenis_kelamin FROM karyawan LIMIT ? OFFSET ?`, [limit, offset]);

    const [karyawan] = await db.promise().query('SELECT id_karyawan, nama_karyawan FROM karyawan');

    res.render('karyawan', {
      karyawan: rows, currentPage: page,
      totalPages: totalPages,
      totalData: totalData,
      limit: limit
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan database');
  }
});

//app.get('/lelang', requireLogin, (req, res) => {
app.get('/lelang', async (req, res) => {
  try {
    const [akanLelang] = await db.promise().query(`
        SELECT 
          l.id_lelang, 
          b.id_barang, 
          b.nama_barang, 
          b.harga_barang as harga_awal,
          l.waktu_mulai, 
          l.waktu_selesai
        FROM Lelang l
        JOIN Barang b ON l.id_barang = b.id_barang
        WHERE l.status_proses = 'akan_lelang'
      `);

    const [prosesLelang] = await db.promise().query(`
        SELECT 
          l.id_lelang, 
          b.id_barang, 
          b.nama_barang, 
          l.harga_awal,
          l.harga_tertinggi,
          l.waktu_mulai, 
          l.waktu_selesai
        FROM Lelang l
        JOIN Barang b ON l.id_barang = b.id_barang
        WHERE l.status_proses = 'berlangsung'
      `);

    res.render('lelang', {
      akanLelang: akanLelang,
      prosesLelang: prosesLelang
    });
  } catch (error) {
    console.error('Error mengambil data lelang:', error);
    res.status(500).send('Gagal memuat halaman lelang');
  }
});

app.post('/konfirmasi-lelang/:id_barang', async (req, res) => {
  const { id_barang } = req.params;
  const { waktu_mulai, waktu_selesai, harga_awal } = req.body;

  try {
    await db.promise().query(`
      UPDATE Barang 
      SET status_barang = 'lelang' 
      WHERE id_barang = ?
    `, [id_barang]);

    await db.promise().query(`
      UPDATE Lelang 
      SET 
        status_lelang = 'aktif', 
        status_proses = 'berlangsung',
        waktu_mulai = ?, 
        waktu_selesai = ?,
        harga_awal = ?
      WHERE id_barang = ?
    `, [waktu_mulai, waktu_selesai, harga_awal, id_barang]);

    res.json({
      success: true,
      message: 'Lelang berhasil dikonfirmasi'
    });
  } catch (error) {
    console.error('Error konfirmasi lelang:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengkonfirmasi lelang'
    });
  }
});

app.post('/tutup-lelang/:id_lelang', async (req, res) => {
  const { id_lelang } = req.params;
  const { pemenang_id, harga_tertinggi } = req.body;

  try {
    await db.promise().query(`
      UPDATE Lelang 
      SET 
        status_lelang = 'selesai', 
        status_proses = 'selesai',
        pemenang_id = ?,
        harga_tertinggi = ?
      WHERE id_lelang = ?
    `, [pemenang_id, harga_tertinggi, id_lelang]);

    await db.promise().query(`
      UPDATE Barang b
      JOIN Lelang l ON b.id_barang = l.id_barang
      SET b.status_barang = 'terjual'
      WHERE l.id_lelang = ?
    `, [id_lelang]);

    res.json({
      success: true,
      message: 'Lelang berhasil ditutup'
    });
  } catch (error) {
    console.error('Error menutup lelang:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menutup lelang'
    });
  }
});

app.post('/perpanjang-lelang/:id_lelang', async (req, res) => {
  const { id_lelang } = req.params;
  const { tambahan_waktu } = req.body;

  try {
    await db.promise().query(`
      UPDATE Lelang 
      SET waktu_selesai = DATE_ADD(waktu_selesai, INTERVAL ? HOUR)
      WHERE id_lelang = ?
    `, [tambahan_waktu, id_lelang]);

    res.json({
      success: true,
      message: 'Waktu lelang berhasil diperpanjang'
    });
  } catch (error) {
    console.error('Error perpanjang lelang:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memperpanjang waktu lelang'
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/pemilik', async (req, res) => {
  try {
    let page = req.query.page ? parseInt(req.query.page) : 1;
    let limit = 10;
    let offset = (page - 1) * limit;
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM kepemilikan WHERE status_kepemilikan = "aktif"');
    let totalData = countResult[0].total;
    let totalPages = Math.ceil(totalData / limit);
    const [rows] = await db.promise().query(`
      SELECT 
          b.id_barang,
          b.nama_barang,
          k1.nama_karyawan AS pemilik_sekarang,
          k1.id_karyawan AS id_pemilik_sekarang,
          k2.nama_karyawan AS pemilik_sebelumnya
      FROM Barang b
      LEFT JOIN (
          SELECT id_barang, id_karyawan
          FROM Kepemilikan
          WHERE status_kepemilikan = 'aktif'
      ) current_own ON b.id_barang = current_own.id_barang
      LEFT JOIN Karyawan k1 ON current_own.id_karyawan = k1.id_karyawan
      LEFT JOIN (
          SELECT k.id_barang, k.id_karyawan
          FROM Kepemilikan k
          WHERE k.status_kepemilikan = 'tidak aktif'
          AND k.tanggal_perolehan = (
              SELECT MAX(k3.tanggal_perolehan)
              FROM Kepemilikan k3
              WHERE k3.id_barang = k.id_barang 
              AND k3.status_kepemilikan = 'tidak aktif'
              AND k3.id_karyawan != (
                  SELECT id_karyawan 
                  FROM Kepemilikan 
                  WHERE id_barang = k.id_barang 
                  AND status_kepemilikan = 'aktif'
              )
          )
      ) prev_own ON b.id_barang = prev_own.id_barang
      LEFT JOIN Karyawan k2 ON prev_own.id_karyawan = k2.id_karyawan
      ORDER BY b.nama_barang
   LIMIT ? OFFSET ?
      `, [limit, offset]);

    res.render('pemilik', {
      kepemilikan: rows, currentPage: page,
      totalPages: totalPages,
      totalData: totalData,
      limit: limit
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/histori-kepemilikan/:idBarang', async (req, res) => {
  try {
    const [histori] = await db.promise().query(`
        WITH RankedKepemilikan AS (
            SELECT 
                k.tanggal_perolehan,
                k.id_karyawan,
                kr.nama_karyawan,
                k.status_kepemilikan,
                ROW_NUMBER() OVER (PARTITION BY k.id_karyawan ORDER BY k.tanggal_perolehan DESC) as rn
            FROM Kepemilikan k
            JOIN Karyawan kr ON k.id_karyawan = kr.id_karyawan
            WHERE k.id_barang = ?
        )
        SELECT 
            tanggal_perolehan,
            nama_karyawan,
            status_kepemilikan
        FROM RankedKepemilikan
        WHERE rn = 1
        ORDER BY tanggal_perolehan DESC`,
      [req.params.idBarang]
    );

    res.json(histori);
  } catch (error) {
    console.error('Error fetching ownership history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/profil', /*requireLogin,*/(req, res) => {
  res.render('profil');
});

app.get('/logadmin', async (req, res) => {
  let page = req.query.page ? parseInt(req.query.page) : 1;
    let limit = 10;
    let offset = (page - 1) * limit;
    const [countResult] = await db.promise().query('SELECT COUNT(*) AS total FROM log_aktivitas');
    let totalData = countResult[0].total;
    let totalPages = Math.ceil(totalData / limit);
  try {
    const [log] = await db.promise().query(`
        SELECT timestamp, id_admin, jenis_aktivitas, detail_perubahan FROM log_aktivitas ORDER BY timestamp DESC LIMIT ? OFFSET ?
      `, [limit, offset]);

    res.render('logadmin', { log ,currentPage: page,
      totalPages: totalPages,
      totalData: totalData,
      limit: limit });

  } catch (err) {
    console.error('Error fetching admin logs:', err);
    res.status(500).send('Internal Server Error');
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;