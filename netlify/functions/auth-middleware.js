// JWT Authentication middleware for admin endpoints
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Auth0 token verification
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {}, // Optional
  timeout: 30000, // Defaults to 30s
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify JWT token
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject(new Error('No token provided'));
      return;
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace('Bearer ', '');

    jwt.verify(cleanToken, getKey, {
      audience: process.env.AUTH0_AUDIENCE || 'team-pinas-admin',
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

// Middleware function to protect admin endpoints
async function requireAuth(event) {
  // In development mode, skip auth if Auth0 is not configured
  if (!process.env.AUTH0_DOMAIN || process.env.AUTH0_DOMAIN === 'your-domain.auth0.com') {
    console.log('Development mode - skipping authentication');
    return {
      success: true,
      user: {
        sub: 'dev-user',
        email: 'admin@teampinas.nl',
        name: 'Development User'
      }
    };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (!authHeader) {
      return {
        success: false,
        error: 'No authorization header provided',
        statusCode: 401
      };
    }

    const decoded = await verifyToken(authHeader);
    
    // Optional: Add additional authorization checks here
    // For example, check if user has admin role:
    // if (!decoded['https://teampinas.nl/roles']?.includes('admin')) {
    //   return {
    //     success: false,
    //     error: 'Insufficient permissions',
    //     statusCode: 403
    //   };
    // }

    return {
      success: true,
      user: decoded
    };
  } catch (error) {
    console.error('Authentication error:', error.message);
    return {
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401
    };
  }
}

// Error response helper
function createAuthErrorResponse(statusCode, error) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ error })
  };
}

module.exports = {
  requireAuth,
  createAuthErrorResponse
};