// Hybrid Authentication middleware for admin endpoints
// Supports both Auth0 JWT and API key authentication
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Auth0 token verification (only if Auth0 is configured)
let jwksClientInstance = null;

function getJwksClient() {
  if (!jwksClientInstance && process.env.AUTH0_DOMAIN) {
    jwksClientInstance = jwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      requestHeaders: {},
      timeout: 30000,
    });
  }
  return jwksClientInstance;
}

function getKey(header, callback) {
  const client = getJwksClient();
  if (!client) {
    callback(new Error('Auth0 not configured'));
    return;
  }
  
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify JWT token (Auth0)
function verifyToken(token) {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject(new Error('No token provided'));
      return;
    }

    if (!process.env.AUTH0_DOMAIN) {
      reject(new Error('Auth0 not configured'));
      return;
    }

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

// Verify API key
function verifyApiKey(apiKey) {
  const expectedApiKey = process.env.ADMIN_API_KEY;
  
  if (!expectedApiKey) {
    throw new Error('ADMIN_API_KEY not configured');
  }
  
  if (!apiKey) {
    throw new Error('No API key provided');
  }
  
  if (apiKey !== expectedApiKey) {
    throw new Error('Invalid API key');
  }
  
  return {
    sub: 'api-key-user',
    email: 'admin@teampinas.nl',
    name: 'API Key User',
    auth_method: 'api_key'
  };
}

// Middleware function to protect admin endpoints
async function requireAuth(event) {
  try {
    // Check for API key first (X-API-Key header)
    const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];
    
    if (apiKey) {
      console.log('Authenticating with API key');
      const user = verifyApiKey(apiKey);
      return {
        success: true,
        user: user
      };
    }

    // Check for Auth0 JWT token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    
    if (authHeader && process.env.AUTH0_DOMAIN) {
      console.log('Authenticating with Auth0 JWT');
      const decoded = await verifyToken(authHeader);
      return {
        success: true,
        user: {
          ...decoded,
          auth_method: 'auth0'
        }
      };
    }

    // Development mode fallback (when neither Auth0 nor API key is configured properly)
    if (!process.env.AUTH0_DOMAIN && !process.env.ADMIN_API_KEY) {
      console.log('Development mode - no authentication configured, allowing access');
      return {
        success: true,
        user: {
          sub: 'dev-user',
          email: 'admin@teampinas.nl',
          name: 'Development User',
          auth_method: 'development'
        }
      };
    }

    // No valid authentication provided
    return {
      success: false,
      error: 'No valid authentication provided. Use X-API-Key header or Authorization Bearer token.',
      statusCode: 401
    };

  } catch (error) {
    console.error('Authentication error:', error.message);
    return {
      success: false,
      error: error.message || 'Authentication failed',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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