export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return (
    error instanceof HttpError ||
    (!!error &&
      typeof error === "object" &&
      (error as { name?: string }).name === "HttpError" &&
      typeof (error as { statusCode?: unknown }).statusCode === "number")
  );
}
