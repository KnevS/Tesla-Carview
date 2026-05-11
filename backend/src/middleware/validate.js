/**
 * Erstellt ein Express-Middleware aus einem Zod-Schema.
 * Gibt HTTP 400 mit strukturierten Fehlerdetails zurueck wenn
 * der Request-Body das Schema nicht erfuellt.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Ungueltiger Request',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
