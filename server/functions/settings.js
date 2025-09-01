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

  try {
    const client = await pool.connect();
    
    try {
      switch (event.httpMethod) {
        case 'GET':
          return await getSettings(client, headers);
        case 'PUT':
          return await updateSettings(client, headers, JSON.parse(event.body));
        default:
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Settings error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process settings request',
        message: error.message
      })
    };
  }
};

async function getSettings(client, headers) {
  // Query signage settings
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
}

async function updateSettings(client, headers, data) {
  const { display_columns, header_height, footer_height } = data;
  
  const updates = [
    { key: 'display_columns', value: display_columns, type: 'number' },
    { key: 'header_height', value: header_height, type: 'number' },
    { key: 'footer_height', value: footer_height, type: 'number' }
  ];

  // Update or insert each setting
  for (const update of updates) {
    await client.query(`
      INSERT INTO signage_settings (setting_key, setting_value, data_type, active, created_at, updated_at)
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (setting_key)
      DO UPDATE SET 
        setting_value = $2,
        data_type = $3,
        updated_at = CURRENT_TIMESTAMP
    `, [update.key, update.value.toString(), update.type]);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Settings updated successfully',
      updated: updates.length
    })
  };
}