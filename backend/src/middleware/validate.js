const { BadRequestError } = require('../utils/errors');

/**
 * Validates req.body/query/params against a Zod schema before the handler
 * runs. This is the single gate that keeps malformed or malicious input
 * (oversized strings, wrong types, unexpected fields) out of business logic
 * and out of the database.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new BadRequestError(`Validation failed: ${JSON.stringify(details)}`));
    }
    // Replace with the parsed (and coerced/defaulted) data.
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
