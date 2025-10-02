import { NextResponse } from 'next/server';

export function successResponse(data: any, message?: string, status = 200) {
  return NextResponse.json({ success: true, data, message }, { status });
}

export function errorResponse(error: string, status = 400, details?: any) {
  return NextResponse.json({ success: false, error, details }, { status });
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = 'Internal server error') {
  return errorResponse(message, 500);
}
