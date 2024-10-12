<?php
session_start();
if (!isset($_SESSION['email'])) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Barang - Manajemen Aset Taspen</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="sidebar">
        <div class="logo">
            <img src="assets/images/logo.png" alt="Logo Taspen">
        </div>
        <ul>
            <li><a href="dashboard.php">Dashboard</a></li>
            <li><a href="databarang.php" class="active">Data Barang</a></li>
            <li><a href="lokasiruangan.php">Lokasi Ruangan</a></li>
            <li><a href="pemilikbarang.php">Pemilik Barang</a></li>
            <li><a href="masalelang.php">Manajemen Lelang</a></li>
            <li><a href="mutasibarang.php">Mutasi Barang</a></li>
            <li><a href="laporan.php">Laporan</a></li>
            <li><a href="pengaturan.php">Pengaturan</a></li>
            <li><a href="bantuan.php">Bantuan dan Panduan</a></li>
            <li><a href="logout.php">Logout</a></li>
        </ul>
    </div>

    <div class="konten-utama">
        <div class="header">
            <h1>Data Barang</h1>
            <div class="pencarian-notifikasi">
                <input type="text" placeholder="Cari">
                <div class="notifikasi">
                    <span class="ikon">🔔</span>
                    <span class="ikon-user">👤</span>
                </div>
            </div>
        </div>

        <button class="btn-baru" onclick="window.location.href='tambahbarang.php'">+ Baru</button>

        <div class="barang-table">
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Kode Barang</th>
                        <th>Nama Barang</th>
                        <th>Kategori</th>
                        <th>Lokasi</th>
                        <th>Pemilik Sebelumnya</th>
                        <th>Masa Lelang</th>
                        <th>Status Lelang</th>
                        <th>Opsi</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    include('db.php');
                    
                    // Ambil data dari tabel barang
                    $sql = "SELECT id, kode_barang, nama_barang, kategori, lokasi, pemilik_sebelumnya, masa_lelang, status_lelang FROM barang";
                    $result = $conn->query($sql);
                    $no = 1;

                    if ($result->num_rows > 0) {
                        while($row = $result->fetch_assoc()) {
                            echo "<tr>";
                            echo "<td>" . $no++ . "</td>";
                            echo "<td>" . $row['kode_barang'] . "</td>";
                            echo "<td>" . $row['nama_barang'] . "</td>";
                            echo "<td>" . $row['kategori'] . "</td>";
                            echo "<td>" . $row['lokasi'] . "</td>";
                            echo "<td>" . $row['pemilik_sebelumnya'] . "</td>";
                            echo "<td>" . $row['masa_lelang'] . "</td>";
                            echo "<td>" . $row['status_lelang'] . "</td>";
                            echo "<td>
                                    <a href='editbarang.php?id=" . $row['id'] . "' class='edit'>✏️</a>
                                    <a href='hapusbarang.php?id=" . $row['id'] . "' class='hapus' onclick='return confirm(\"Apakah Anda yakin ingin menghapus barang ini?\");'>🗑️</a>
                                  </td>";
                            echo "</tr>";
                        }
                    } else {
                        echo "<tr><td colspan='9'>Tidak ada data barang tersedia</td></tr>";
                    }

                    $conn->close();
                    ?>
                </tbody>
            </table>
        </div>

        <!-- Pagination (Contoh Sederhana) -->
        <div class="pagination">
            <button>❮</button>
            <button class="active">1</button>
            <button>2</button>
            <button>3</button>
            <button>❯</button>
        </div>
    </div>

    <script src="assets/js/dashboard.js"></script>
</body>
</html>
