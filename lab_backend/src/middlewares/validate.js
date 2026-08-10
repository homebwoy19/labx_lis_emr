/**
 * Request validation middleware factory.
 *
 * Accepts a schema map { body?, query?, params? } of Zod schemas. Parsed,
 * type-coerced values REPLACE the raw request values so downstream handlers
 * receive clean, trusted input. Failures throw ZodError, handled centrally.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;
