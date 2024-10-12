<?php
include('db.php');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Mengambil data dari form pendaftaran
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'];

    // Melakukan hashing pada password
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // Menggunakan prepared statement untuk memasukkan data ke database
    $stmt = $conn->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $stmt->bind_param("ss", $email, $hashedPassword);

    if ($stmt->execute()) {
        echo "<script>alert('Pendaftaran berhasil!'); window.location.href = 'index.php';</script>";
    } else {
        echo "<script>alert('Terjadi kesalahan. Silakan coba lagi.'); window.location.href = 'register.php';</script>";
    }

    // Menutup statement dan koneksi
    $stmt->close();
    $conn->close();
}
?>
