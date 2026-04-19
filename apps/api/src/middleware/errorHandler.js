class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  console.error('Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { AppError, errorHandler };
