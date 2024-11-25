import { TOKEN_SERVER } from '../../utils/constant.js';

const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token || token !== `Bearer ${TOKEN_SERVER}`) return res.status(401).send('Access denied. Not authenticated...');
  try {
    next();
  } catch (ex) {
    res.status(400).send('Invalid auth token...');
  }
};

export { auth };
