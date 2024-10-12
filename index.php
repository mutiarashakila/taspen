<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manajemen Aset Taspen KC Bogor</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="login-container">
        <div class="left-side">
            <div class="taspen-logo">
                <img src="assets/images/taspen-logo.png" alt="Taspen Logo">
            </div>
            <h1>MANAJEMEN ASET TASPEN</h1>
            <h2>KC BOGOR</h2>
            <div class="illustration">
                <img src="assets/images/illustration.png" alt="Illustration">
            </div>
        </div>
        <div class="right-side">
            <h2>Welcome!</h2>
            <p>Sign in to continue</p>
            <form action="login_process.php" method="post">
                <label for="email">Email</label>
                <input type="email" name="email" id="email" placeholder="Enter your email" required>
                
                <label for="password">Password</label>
                <div class="password-container">
                    <input type="password" id="password" name="password" placeholder="Enter your password" required>
                    <a href="#" class="forgot-password">Forgot Password?</a>
                    <span id="toggle-password" onclick="togglePasswordVisibility()">
                        <img id="eye-icon" src="assets/images/eye-closed.png" alt="Show Password">
                    </span>
                </div>
                
                <div class="remember-me">
                    <input type="checkbox" name="remember_me" id="remember_me">
                    <label for="remember_me">Remember me</label>
                </div>
                
                <button type="submit" class="sign-in-btn">Sign in</button>
            </form>
            <p>Or</p>
            <button class="google-btn">
                <img src="assets/images/google-icon.png" alt="Google Icon">
                Sign in with Google
            </button>
        </div>
    </div>
    
    <script src="assets/js/togglePassword.js"></script>

    <span id="toggle-password" onclick="togglePasswordVisibility()" title="Show/Hide Password">
    <img id="eye-icon" src="assets/images/eye-closed.png" alt="Show Password">
</span>

</body>
</html>
