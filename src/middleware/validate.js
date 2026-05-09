// Tiny request validator that runs Zod schemas against `body`, `query`, or `params`.
// Validation errors are forwarded to the centralized error handler.
const validate = (schemas) => (req, res, next) => {
  try {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) req.query = schemas.query.parse(req.query);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = validate;
