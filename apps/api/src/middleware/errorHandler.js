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
  // Log the full error for debugging but never expose internals to client
  console.error('Unexpected error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { AppError, errorHandler };
