<?php
$servername = "localhost"; // Host server, biasanya localhost
$username = "root";        // Username MySQL Anda (default: "root" untuk XAMPP/WAMP)
$password = "";            // Password MySQL Anda (default: kosong "" untuk XAMPP/WAMP)
$dbname = "taspen_manajemen"; // Nama database yang Anda buat

// Membuat koneksi
$conn = new mysqli($servername, $username, $password, $dbname);

// Memeriksa koneksi
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
