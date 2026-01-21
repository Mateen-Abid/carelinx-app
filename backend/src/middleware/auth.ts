import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';

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
    // Read token from httpOnly cookie (set during login)
    const token = req.cookies.access_token;

    if (!token) {
      console.log('❌ Auth: No token in cookie');
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    // Validate token with Supabase (backend only, frontend can't see this)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
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

