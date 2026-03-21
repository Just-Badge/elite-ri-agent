import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Generic API error response with consistent `{ error }` JSON shape.
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 401 Unauthorized response.
 */
export function apiUnauthorized(message = "Unauthorized"): NextResponse {
  return apiError(message, 401);
}

/**
 * 404 Not Found response.
 */
export function apiNotFound(message = "Not found"): NextResponse {
  return apiError(message, 404);
}

/**
 * 400 Bad Request response.
 */
export function apiBadRequest(message = "Bad request"): NextResponse {
  return apiError(message, 400);
}

/**
 * 400 Validation Error response with Zod issues.
 */
export function apiValidationError(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: "Validation failed", issues: error.issues },
    { status: 400 }
  );
}
