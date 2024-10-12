<?php
session_start();
if (!isset($_SESSION['email'])) {
    header("Location: index.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Taspen Management</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="dashboard">
        <h1>Welcome to Dashboard</h1>
        <p>Halo, <?php echo $_SESSION['email']; ?></p>
        <a href="logout.php">Logout</a>
    </div>
</body>
</html>
