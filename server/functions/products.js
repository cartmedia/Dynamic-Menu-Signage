// Netlify Function for Team Pinas Signage - Products API
// Connects to Neon database and returns products data

const { Pool } = require('pg');

// Initialize Neon connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests for products
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
      // Query to get categories and their products
      // Adjust this query based on your actual Neon database schema
      const categoriesQuery = `
        SELECT 
          c.id as category_id,
          c.name as category_title,
          c.display_order,
          json_agg(
            json_build_object(
              'name', p.name,
              'price', p.price
            ) ORDER BY p.display_order, p.name
          ) as items
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id 
        WHERE c.active = true AND (p.active = true OR p.active IS NULL)
        GROUP BY c.id, c.name, c.display_order
        ORDER BY c.display_order, c.name
      `;

      const result = await client.query(categoriesQuery);
      
      // Transform to expected format
      const categories = result.rows.map(row => ({
        title: row.category_title,
        items: row.items.filter(item => item.name !== null) // Remove null products
      })).filter(category => category.items.length > 0); // Remove empty categories

      const response = {
        categories: categories,
        lastUpdated: new Date().toISOString(),
        source: 'neon-database'
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Database error:', error);
    
    // Return fallback data if available or error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch products',
        message: error.message,
        categories: [] // Empty fallback
      })
    };
  }
};