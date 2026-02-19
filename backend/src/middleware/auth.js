import jwt from 'jsonwebtoken';

export const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

export const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.userRole) return res.status(403).json({ success: false, message: 'Forbidden' });
        if (!roles.includes(req.userRole)) return res.status(403).json({ success: false, message: 'Insufficient role' });
        next();
    };
};