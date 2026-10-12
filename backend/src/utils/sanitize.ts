const SENSITIVE = /password|token|secret|authorization|cookie|card|cvv|pan/i;

export function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForLog(item));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE.test(key) ? '[redacted]' : sanitizeForLog(nested);
    }
    return output;
  }
  return value;
}
