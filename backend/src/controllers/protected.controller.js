function adminMe(req, res) {
  return res.status(200).json({
    message: 'Admin access granted',
    context: req.context,
  });
}

function userMe(req, res) {
  return res.status(200).json({
    message: 'User access granted',
    context: req.context,
  });
}

module.exports = { adminMe, userMe };
