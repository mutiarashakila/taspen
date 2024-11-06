const requireLogin = (req, res, next) => {
    if (req.session && req.session.email) {
      next();
    } else {
      console.log('Auth failed: No session found');
      res.redirect('/login');
    }
  };
  
  module.exports = { requireLogin };