// Netlify Function for Team Pinas Signage - Settings API
// Returns signage configuration from Neon database

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const client = await pool.connect();
    
    try {
      // Query signage settings
      // Adjust based on your schema
      const settingsQuery = `
        SELECT 
          setting_key,
          setting_value,
          data_type
        FROM signage_settings 
        WHERE active = true
      `;

      const result = await client.query(settingsQuery);
      
      // Transform to key-value object
      const settings = {};
      result.rows.forEach(row => {
        let value = row.setting_value;
        
        // Parse based on data type
        switch(row.data_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              console.warn(`Failed to parse JSON for ${row.setting_key}`);
            }
            break;
          // 'string' and default case use value as-is
        }
        
        settings[row.setting_key] = value;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          settings: settings,
          lastUpdated: new Date().toISOString()
        })
      };

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Settings error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch settings',
        settings: {} // Empty fallback
      })
    };
  }
};