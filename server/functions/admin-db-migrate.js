// Netlify Function for Team Pinas Signage - Database Migration
// Adds on_sale and is_new columns to products table

const { Pool } = require('pg');

// Initialize Neon connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// API key for admin access
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check authentication
  const apiKey = event.headers['x-api-key'] || event.headers['X-API-Key'];
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid API key' })
    };
  }

  try {
    const client = await pool.connect();
    
    try {
      console.log('Starting database migration...');
      
      // Check if columns already exist
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name IN ('on_sale', 'is_new')
      `;
      
      const existingColumns = await client.query(checkQuery);
      console.log('Existing columns:', existingColumns.rows);
      
      const hasOnSale = existingColumns.rows.some(row => row.column_name === 'on_sale');
      const hasIsNew = existingColumns.rows.some(row => row.column_name === 'is_new');
      
      const migrations = [];
      
      // Add on_sale column if it doesn't exist
      if (!hasOnSale) {
        const addOnSaleQuery = `
          ALTER TABLE products 
          ADD COLUMN on_sale BOOLEAN DEFAULT FALSE
        `;
        await client.query(addOnSaleQuery);
        migrations.push('Added on_sale column');
        console.log('Added on_sale column');
      } else {
        migrations.push('on_sale column already exists');
      }
      
      // Add is_new column if it doesn't exist
      if (!hasIsNew) {
        const addIsNewQuery = `
          ALTER TABLE products 
          ADD COLUMN is_new BOOLEAN DEFAULT FALSE
        `;
        await client.query(addIsNewQuery);
        migrations.push('Added is_new column');
        console.log('Added is_new column');
      } else {
        migrations.push('is_new column already exists');
      }
      
      // Set some example products to have badges for testing
      if (!hasOnSale || !hasIsNew) {
        const updateExamplesQuery = `
          UPDATE products SET 
            on_sale = TRUE 
          WHERE name IN ('Proteineshake', 'M&M', 'Cola', 'Koffie', 'Redbull');
          
          UPDATE products SET 
            is_new = TRUE 
          WHERE name IN ('OMEGA 3', 'Pringles', 'Lipton Green', 'Cappuccino', 'Flow Energy');
        `;
        await client.query(updateExamplesQuery);
        migrations.push('Set example products with badges');
        console.log('Set example products with badges');
      }
      
      // Get updated schema info
      const schemaQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'products'
        ORDER BY ordinal_position
      `;
      
      const schemaResult = await client.query(schemaQuery);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          migrations: migrations,
          schema: schemaResult.rows,
          message: 'Database migration completed successfully'
        })
      };

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Migration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Migration failed', 
        details: error.message 
      })
    };
  }
};