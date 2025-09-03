// Auth0 Configuration API
// Returns Auth0 config from environment variables or development mode

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const config = {
      // Check if Auth0 is configured via environment variables
      domain: process.env.AUTH0_DOMAIN || null,
      clientId: process.env.AUTH0_CLIENT_ID || null,
      audience: process.env.AUTH0_AUDIENCE || 'team-pinas-admin',
      // Check if we're in development or if Auth0 isn't properly configured
      developmentMode: !process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        config,
        message: config.developmentMode 
          ? 'Running in development mode - Auth0 not configured'
          : 'Auth0 configuration loaded'
      })
    };
  } catch (error) {
    console.error('Auth config error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load auth configuration',
        developmentMode: true 
      })
    };
  }
};