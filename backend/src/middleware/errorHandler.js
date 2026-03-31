import mongoose from 'mongoose';

export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status === 500) {
    console.error(`| 🔥 SERVER ERROR | ${req.method} ${req.originalUrl}`);
    console.error(`| Error: ${message}`);
    console.error(`| DB Status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'DISCONNECTED (' + mongoose.connection.readyState + ')'}`);
    if (err.stack) console.error(`| Stack: ${err.stack}`);
  } else {
    console.error(`❌ [Error] ${status}: ${message}`);
  }

  res.status(status).json({
    success: false,
    message,
    dbStatus: mongoose.connection.readyState,
    error: message,
    path: req.originalUrl,
  });
};

export const notFoundHandler = (req, res) => {
  console.error(`❌ 404 NOT FOUND: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

// Returns 503 immediately if MongoDB is not connected — prevents hang/crash
export const requireDB = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please retry in a moment.',
    });
  }
  next();
};
