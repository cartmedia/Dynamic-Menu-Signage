// Netlify Function to verify API key for admin access
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { apiKey } = JSON.parse(event.body);
    const expectedApiKey = process.env.ADMIN_API_KEY;

    // Check if API key is configured
    if (!expectedApiKey) {
      console.error('ADMIN_API_KEY not configured in environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          valid: false 
        })
      };
    }

    // Verify API key
    const valid = apiKey && apiKey === expectedApiKey;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        valid,
        message: valid ? 'API key valid' : 'Invalid API key'
      })
    };

  } catch (error) {
    console.error('API key verification error:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: 'Invalid request',
        valid: false 
      })
    };
  }
};