const DEFAULT_ERROR_MESSAGE = '\u8bf7\u6c42\u5931\u8d25';

export class AppError extends Error {
  code?: number;
  cause?: unknown;
  details?: unknown;
  kind: 'auth' | 'network' | 'server' | 'validation' | 'unknown';
  isTokenExpired?: boolean;

  constructor(
    message: string,
    options: {
      code?: number;
      cause?: unknown;
      details?: unknown;
      kind?: AppError['kind'];
      isTokenExpired?: boolean;
    } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.cause = options.cause;
    this.details = options.details;
    this.kind = options.kind ?? 'unknown';
    this.isTokenExpired = options.isTokenExpired;
  }
}

export class AuthError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'kind'> = {},
  ) {
    super(message, {...options, kind: 'auth'});
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'kind'> = {},
  ) {
    super(message, {...options, kind: 'network'});
    this.name = 'NetworkError';
  }
}

export class ServerError extends AppError {
  constructor(
    message: string,
    options: Omit<ConstructorParameters<typeof AppError>[1], 'kind'> = {},
  ) {
    super(message, {...options, kind: 'server'});
    this.name = 'ServerError';
  }
}

export function toAppError(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message || fallbackMessage, {
      cause: error,
      kind: 'unknown',
    });
  }

  return new AppError(fallbackMessage, {cause: error, kind: 'unknown'});
}

export function getErrorMessage(error: unknown, fallbackMessage = DEFAULT_ERROR_MESSAGE): string {
  return toAppError(error, fallbackMessage).message;
}
