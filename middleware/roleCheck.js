const roleCheck = (roles) => (req, res, next) => {
  console.log('User Role:', req.user?.role); // Debug
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

module.exports = roleCheck;
