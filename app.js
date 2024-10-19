const express = require('express');
const path = require('path');
const app = express();

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Set view engine
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('login', { title: 'Login' });
  });

app.get('/dashboard', (req, res) => {
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
app.get('/barang', (req, res) => {
    res.render('barang');
  });
app.get('/lelang', (req, res) => {
    res.render('lelang');
  });
app.get('/login', (req, res) => {
    res.render('login');
  });
app.get('/mutasi', (req, res) => {
    res.render('mutasi');
  });
app.get('/pemilik', (req, res) => {
    res.render('pemilik');
  });
app.get('/profil', (req, res) => {
    res.render('profil');
  });

const port = 3000;
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});