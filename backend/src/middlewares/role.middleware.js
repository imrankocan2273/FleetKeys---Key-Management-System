function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    const role = req.context?.role;

    if (!role) {
      return res.status(403).json({ message: 'Role context missing' });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        message: 'Forbidden for current role',
        required: allowedRoles,
        current: role,
      });
    }

    return next();
  };
}

module.exports = { requireRole };
