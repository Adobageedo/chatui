import { NextResponse } from "next/server";

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standardized API response helpers
 */
export class ApiResponseBuilder {
  static success<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(
      { success: true, data },
      { status }
    );
  }

  static error(
    error: string,
    status = 500,
    details?: string
  ): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
      { success: false, error, details },
      { status }
    );
  }

  static badRequest(error: string, details?: string): NextResponse<ApiErrorResponse> {
    return this.error(error, 400, details);
  }

  static unauthorized(error = "Unauthorized"): NextResponse<ApiErrorResponse> {
    return this.error(error, 401);
  }

  static notFound(error = "Not found"): NextResponse<ApiErrorResponse> {
    return this.error(error, 404);
  }

  static serverError(error: Error | unknown): NextResponse<ApiErrorResponse> {
    const message = error instanceof Error ? error.message : "Internal server error";
    const details = error instanceof Error ? error.stack : undefined;
    return this.error(message, 500, details);
  }
}
