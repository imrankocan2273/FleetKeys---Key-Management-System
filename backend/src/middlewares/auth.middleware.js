const { supabase } = require('../config/supabase');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing Bearer token' });
  }

  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return res.status(401).json({ message: 'Invalid Bearer token' });
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  req.auth = {
    accessToken,
    user: data.user,
  };

  return next();
}

module.exports = { requireAuth };
