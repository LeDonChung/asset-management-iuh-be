// Shared error response helper for consistent API error structure
export function errorResponse(code: string, message: string, details?: any) {
  return details ? { code, message, details } : { code, message };
}
