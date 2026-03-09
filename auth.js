const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Extract the token from the Authorization header (Bearer <token>)
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token using the secret key
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach the user data (userId, email) to the request object
        req.user = verified;
        
        // Proceed to the next middleware or route handler
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token.' });
    }
};