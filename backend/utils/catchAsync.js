/**
 * Wraps async controller functions to eliminate try/catch boilerplate.
 * Passes any thrown error to Express next() for centralized handling.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;