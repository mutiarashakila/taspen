const db = require('../db.js');

const requireLogin = async (req, res, next) => {
  if (req.session && req.session.email) {
    try {
      const [adminRows] = await db.query(
        'SELECT id_admin FROM Admin WHERE email = ?',
        [req.session.email]
      );

      if (adminRows.length > 0) {
        req.adminId = adminRows[0].id_admin;
        next();
      } else {
        console.log('Auth failed: Admin not found');
        res.redirect('/login');
      }
    } catch (error) {
      console.error('Error fetching admin:', error);
      res.redirect('/login');
    }
  } else {
    console.log('Auth failed: No session found');
    res.redirect('/login');
  }
};

module.exports = { requireLogin };