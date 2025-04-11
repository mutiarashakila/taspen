const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'inventas'
});

const newAdmin = {
  id_user: 'ad00923',
    email: 'admin123@gmail.com',
    password: 'admin123',
    role: 'admin'
  }; 

db.connect(async (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newAdmin.password, salt);

    const sql = 'INSERT into users (id_user, email, password, role) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [newAdmin.id_user, newAdmin.email, hashedPassword, newAdmin.role], (err, result) => {
      if (err) {
        console.error('Error adding admin:', err);
      } else {
        console.log('Admin added successfully!');
        console.log('id_user:', newAdmin.id_user);
        console.log('Email:', newAdmin.email);
        console.log('Password:', newAdmin.password);
        console.log('Role:', newAdmin.role);
      }
      db.end();
    });

  } catch (error) {
    console.error('Error:', error);
    db.end();
  }
});