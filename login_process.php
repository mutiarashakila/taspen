<?php
session_start();
include('db.php');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Mengambil data dari form dan membersihkannya
    $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
    $password = $_POST['password'];

    // Menggunakan prepared statement untuk keamanan
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Mengambil data pengguna dari hasil query
        $user = $result->fetch_assoc();
        
        // Verifikasi password yang diinput dengan password yang di-hash
        if (password_verify($password, $user['password'])) {
            // Login berhasil
            $_SESSION['email'] = $user['email'];
            header("Location: dashboard.php");
            exit();
        } else {
            // Password salah
            echo "<script>alert('Email atau password salah. Silakan coba lagi.'); window.location.href = 'index.php';</script>";
        }
    } else {
        // Pengguna tidak ditemukan
        echo "<script>alert('Email atau password salah. Silakan coba lagi.'); window.location.href = 'index.php';</script>";
    }

    // Menutup statement dan koneksi
    $stmt->close();
}

$conn->close();
?>
