// Admin API for Categories CRUD operations
const { Pool } = require('pg');
const { requireAuth, createAuthErrorResponse } = require('./auth-middleware');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Require authentication for all admin endpoints
  const authResult = await requireAuth(event);
  if (!authResult.success) {
    return createAuthErrorResponse(authResult.statusCode, authResult.error);
  }

  const client = await pool.connect();

  try {
    switch (event.httpMethod) {
      case 'GET':
        return await getCategories(client, headers);
      
      case 'POST':
        return await createCategory(client, headers, JSON.parse(event.body));
      
      case 'PUT':
        return await updateCategory(client, headers, JSON.parse(event.body), event.queryStringParameters?.id);
      
      case 'DELETE':
        return await deleteCategory(client, headers, event.queryStringParameters?.id);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Admin categories error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    client.release();
  }
};

async function getCategories(client, headers) {
  const query = `
    SELECT 
      c.*,
      COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.active = true
    GROUP BY c.id
    ORDER BY c.display_order, c.name
  `;
  
  const result = await client.query(query);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      categories: result.rows,
      count: result.rows.length
    })
  };
}

async function createCategory(client, headers, data) {
  const { name, display_order = 0, active = true } = data;
  
  if (!name) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Name is required' })
    };
  }

  const query = `
    INSERT INTO categories (name, display_order, active)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  
  const result = await client.query(query, [name, display_order, active]);
  
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      category: result.rows[0],
      message: 'Category created successfully'
    })
  };
}

async function updateCategory(client, headers, data, categoryId) {
  if (!categoryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Category ID is required' })
    };
  }

  const { name, display_order, active } = data;
  
  const query = `
    UPDATE categories 
    SET name = $1, display_order = $2, active = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
  `;
  
  const result = await client.query(query, [name, display_order, active, categoryId]);
  
  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Category not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      category: result.rows[0],
      message: 'Category updated successfully'
    })
  };
}

async function deleteCategory(client, headers, categoryId) {
  if (!categoryId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Category ID is required' })
    };
  }

  // Check if category has products
  const productCheck = await client.query('SELECT COUNT(*) as count FROM products WHERE category_id = $1', [categoryId]);
  
  if (parseInt(productCheck.rows[0].count) > 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Cannot delete category with products. Delete products first.' })
    };
  }

  const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
  const result = await client.query(query, [categoryId]);
  
  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Category not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Category deleted successfully',
      deletedCategory: result.rows[0]
    })
  };
}