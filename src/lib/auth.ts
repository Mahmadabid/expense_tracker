import { NextRequest, NextResponse } from "next/server";

type DecodedToken = {
  uid: string;
  email?: string;
  email_verified?: boolean;
  [key: string]: unknown;
};

/**
 * Verify Firebase ID token using Firebase Auth REST API
 * This is simpler and more reliable than manual JWT verification
 */
async function verifyFirebaseToken(token: string): Promise<DecodedToken> {
  const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!FIREBASE_API_KEY) {
    throw new Error("Firebase API key not configured");
  }

  try {
    // Use Firebase's token verification endpoint
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "Token verification failed");
    }

    const data = await response.json() as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoUrl?: string;
        [key: string]: unknown;
      }>;
    };

    if (!data.users || data.users.length === 0) {
      throw new Error("No user found for token");
    }

    const user = data.users[0];

    return {
      uid: user.localId,
      email: user.email,
      email_verified: user.emailVerified,
    } as DecodedToken;
  } catch (error) {
    throw new Error(
      `Token verification failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

export type AuthenticatedRequest = NextRequest & {
  user: DecodedToken;
};

// Handler without params (for non-dynamic routes)
export type SecureRouteHandler = (
  req: AuthenticatedRequest
) => Promise<NextResponse> | NextResponse;

// Handler with params (for dynamic routes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SecureRouteHandlerWithParams<T = any> = (
  req: AuthenticatedRequest,
  props: { params: T }
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper function to secure API routes with JWT authentication
 * 
 * Overload 1: For handlers without params
 */
export function withAuth(
  handler: SecureRouteHandler
): (req: NextRequest) => Promise<NextResponse>;

/**
 * Overload 2: For handlers with params (dynamic routes)
 */
export function withAuth<T>(
  handler: SecureRouteHandlerWithParams<T>
): (req: NextRequest, props: { params: T }) => Promise<NextResponse>;

/**
 * Implementation
 */
export function withAuth<T = Record<string, string>>(
  handler: SecureRouteHandler | SecureRouteHandlerWithParams<T>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return async (
    req: NextRequest,
    props?: { params: T }
  ): Promise<NextResponse> => {
    try {
      // Extract token from Authorization header
      const token = extractToken(req);

      if (!token) {
        return NextResponse.json(
          { error: "Authorization token required" },
          { status: 401 }
        );
      }

      // Verify the Firebase token
      const decodedToken = await verifyFirebaseToken(token);

      // Attach user to request
      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = decodedToken;

      // Call the actual handler
      if (props) {
        // Handler with params
        return await (handler as SecureRouteHandlerWithParams<T>)(
          authenticatedReq,
          props
        );
      } else {
        // Handler without params
        return await (handler as SecureRouteHandler)(authenticatedReq);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: error instanceof Error ? error.message : "Invalid token",
        },
        { status: 401 }
      );
    }
  };
}
