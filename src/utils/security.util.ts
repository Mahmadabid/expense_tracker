/**
 * Sanitize input to prevent NoSQL injection attacks
 * Removes dangerous operators and special characters
 */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === 'string') {
    // Remove MongoDB operators and special characters
    return input
      .replace(/[${}]/g, '') // Remove $, {, }
      .replace(/\\/g, '') // Remove backslashes
      .trim();
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      // Skip keys that start with $ or contain dots (MongoDB operators)
      if (!key.startsWith('$') && !key.includes('.')) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Validate ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  // Remove special regex characters and MongoDB operators
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\$/g, '')
    .trim()
    .slice(0, 100); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric input
 */
export function isValidNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value) && value >= 0;
  }
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num) && num >= 0;
  }
  return false;
}

/**
 * Sanitize and validate API request body
 */
export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  requiredFields: string[]
): { valid: boolean; data?: T; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const sanitized = sanitizeInput(body) as T;

  for (const field of requiredFields) {
    if (!(field in sanitized) || sanitized[field] === undefined || sanitized[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  return { valid: true, data: sanitized };
}
