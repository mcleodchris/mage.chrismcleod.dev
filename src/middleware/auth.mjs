// auth.mjs

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  
  if (token !== process.env.SHARED_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.authenticated = true;
  
  next();
}