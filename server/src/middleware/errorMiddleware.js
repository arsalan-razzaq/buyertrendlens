const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (error, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: error.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  });
};

module.exports = {
  notFound,
  errorHandler
};
