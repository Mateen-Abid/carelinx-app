import { Request, Response, NextFunction } from 'express';
import { createSupabaseAdminClient } from '../config/supabase';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Authentication Middleware
 * 
 * This middleware:
 * 1. Reads JWT token from httpOnly cookie (NOT from Authorization header)
 * 2. Validates token with Supabase (on backend, invisible to frontend)
 * 3. Attaches user object to request
 * 
 * IMPORTANT: Frontend NEVER sees the token in network tab!
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log request details for debugging (without exposing secrets)
    const hasCookies = !!req.cookies && Object.keys(req.cookies).length > 0;
    const cookieNames = req.cookies ? Object.keys(req.cookies) : [];
    
    console.log('🔐 Auth middleware:', {
      path: req.path,
      method: req.method,
      hasCookies,
      cookieNames: cookieNames.length > 0 ? cookieNames : 'none',
      origin: req.headers.origin || 'none',
    });

    // Read token from httpOnly cookie (set during login)
    const token = req.cookies.access_token;

    if (!token) {
      console.log('❌ Auth: No token in cookie');
      console.log('   Available cookies:', cookieNames);
      console.log('   Request origin:', req.headers.origin);
      console.log('   Request host:', req.headers.host);
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    console.log('🔑 Token found in cookie (length:', token.length, ')');

    // Use a request-scoped client for token validation so service-role DB
    // queries on the shared client are never contaminated by a user session.
    const authClient = createSupabaseAdminClient();
    const { data: { user }, error } = await authClient.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Auth: Invalid token:', error?.message);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    console.log('✅ Auth: User authenticated:', user.email);
    
    // Attach user to request for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional Auth Middleware
 * Doesn't fail if no token, just continues
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.access_token;

    if (token) {
      const authClient = createSupabaseAdminClient();
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user) {
        req.user = user;
        console.log('✅ Optional Auth: User found:', user.email);
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

