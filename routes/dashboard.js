const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { requireLogin } = require('../routes/auth.js');

router.get('/', requireLogin, async (req, res) => {
  try {
    const [totalBarang] = await db.query('SELECT COUNT(id_barang) as total FROM barang');
    const [barangLelang] = await db.query('SELECT COUNT(id_barang) as total FROM barang WHERE status_barang = "proses"');
    const [akanLelang] = await db.query('SELECT COUNT(id_barang) as total FROM barang WHERE status_barang = "lelang"');
    const [barangTersedia] = await db.query('SELECT COUNT(id_barang) as total FROM barang WHERE status_barang = "tersedia"');
    
    const [notif] = await db.query('SELECT COUNT(id_notifikasi) as total FROM notifikasi WHERE status_baca = "0"');
    
    // Get the latest notification message; if there are none, set a default message
    const [peringatanResult] = await db.query('SELECT pesan FROM notifikasi ORDER BY id_notifikasi DESC LIMIT 1');
    const peringatan = peringatanResult.length ? peringatanResult[0].pesan : 'Tidak ada notifikasi';

    const [latestItems] = await db.query(`
      SELECT 
        b.id_barang,
        b.nama_barang,
        b.kategori,
        b.lokasi_barang,
        k.nama_karyawan as pemilik
      FROM 
        barang b
      LEFT JOIN kepemilikan kp ON b.id_barang = kp.id_barang AND kp.status_kepemilikan = 'aktif'
      LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
      ORDER BY b.id_barang DESC LIMIT 6
    `);

    const chartData = {
      type: 'doughnut',
      data: {
        labels: ['Tersedia', 'Akan Lelang', 'Sedang Lelang'],
        datasets: [{
          data: [barangTersedia[0].total || 0, akanLelang[0].total || 0, barangLelang[0].total || 0],
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
      totalBarang: totalBarang[0].total || 0,
      barangLelang: barangLelang[0].total || 0,
      akanLelang: akanLelang[0].total || 0,
      barangTersedia: barangTersedia[0].total || 0,
      notif: notif[0].total || 0,
      peringatan: peringatan,
      latestItems: latestItems,
      chartData: chartData,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
