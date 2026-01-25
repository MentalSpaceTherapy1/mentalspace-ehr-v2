/**
 * Helper utilities for handling unknown error types in catch blocks
 * TypeScript strict mode requires explicit handling of unknown error types
 */

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}

/**
 * Safely extract error code from unknown error type
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

/**
 * Check if error is an Error instance with specific properties
 */
export function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return error instanceof Error && 'code' in error;
}

/**
 * Check if error has a specific property
 */
export function hasErrorProperty<K extends string>(
  error: unknown,
  prop: K
): error is Record<K, unknown> {
  return error !== null && typeof error === 'object' && prop in error;
}

/**
 * Safely extract error name from unknown error type
 */
export function getErrorName(error: unknown): string {
  if (error instanceof Error) {
    return error.name;
  }
  return 'UnknownError';
}

/**
 * Safely extract error stack from unknown error type
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Safely extract status code from error (for HTTP errors)
 * Returns defaultCode if status code cannot be extracted
 */
export function getErrorStatusCode(error: unknown, defaultCode: number = 500): number {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    return typeof code === 'number' ? code : defaultCode;
  }
  return defaultCode;
}

/**
 * Safely extract error code string from error
 */
export function getErrorCodeString(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'errorCode' in error) {
    return String((error as { errorCode: unknown }).errorCode);
  }
  return undefined;
}
