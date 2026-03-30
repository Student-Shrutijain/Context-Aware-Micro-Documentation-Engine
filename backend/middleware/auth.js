const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_fallback';
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = decoded; // Contains id and username
      next();
    } catch (err) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = authMiddleware;
