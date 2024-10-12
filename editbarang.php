<?php
session_start();
if (!isset($_SESSION['email'])) {
    header("Location: index.php");
    exit();
}

include('db.php');

// Cek apakah ada parameter ID yang dikirim
if (isset($_GET['id'])) {
    $id = $_GET['id'];

    // Ambil data barang berdasarkan ID
    $sql = "SELECT * FROM barang WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    // Jika data ditemukan
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
    } else {
        echo "Data barang tidak ditemukan.";
        exit();
    }
} else {
    header("Location: databarang.php");
    exit();
}

// Proses update data barang
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $kode_barang = $_POST['kode_barang'];
    $nama_barang = $_POST['nama_barang'];
    $kategori = $_POST['kategori'];
    $lokasi = $_POST['lokasi'];
    $pemilik_sebelumnya = $_POST['pemilik_sebelumnya'];
    $masa_lelang = $_POST['masa_lelang'];
    $status_lelang = $_POST['status_lelang'];

    // Query update
    $sql = "UPDATE barang SET kode_barang=?, nama_barang=?, kategori=?, lokasi=?, pemilik_sebelumnya=?, masa_lelang=?, status_lelang=? WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssssi", $kode_barang, $nama_barang, $kategori, $lokasi, $pemilik_sebelumnya, $masa_lelang, $status_lelang, $id);

    if ($stmt->execute()) {
        echo "<script>alert('Data barang berhasil diupdate!'); window.location.href='databarang.php';</script>";
    } else {
        echo "Terjadi kesalahan saat mengupdate data.";
    }
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Edit Barang</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="konten-utama">
        <h1>Edit Barang</h1>
        <form action="" method="POST">
            <label>Kode Barang</label>
            <input type="text" name="kode_barang" value="<?php echo $row['kode_barang']; ?>" required>
            
            <label>Nama Barang</label>
            <input type="text" name="nama_barang" value="<?php echo $row['nama_barang']; ?>" required>
            
            <label>Kategori</label>
            <input type="text" name="kategori" value="<?php echo $row['kategori']; ?>" required>
            
            <label>Lokasi</label>
            <input type="text" name="lokasi" value="<?php echo $row['lokasi']; ?>" required>
            
            <label>Pemilik Sebelumnya</label>
            <input type="text" name="pemilik_sebelumnya" value="<?php echo $row['pemilik_sebelumnya']; ?>" required>
            
            <label>Masa Lelang</label>
            <input type="text" name="masa_lelang" value="<?php echo $row['masa_lelang']; ?>" required>
            
            <label>Status Lelang</label>
            <input type="text" name="status_lelang" value="<?php echo $row['status_lelang']; ?>" required>
            
            <button type="submit">Update Barang</button>
        </form>
    </div>
</body>
</html>
