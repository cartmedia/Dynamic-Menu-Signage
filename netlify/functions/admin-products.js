// Admin API for Products CRUD operations
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        return await getProducts(client, headers, event.queryStringParameters);
      
      case 'POST':
        return await createProduct(client, headers, JSON.parse(event.body));
      
      case 'PUT':
        return await updateProduct(client, headers, JSON.parse(event.body), event.queryStringParameters?.id);
      
      case 'DELETE':
        return await deleteProduct(client, headers, event.queryStringParameters?.id);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Admin products error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  } finally {
    client.release();
  }
};

async function getProducts(client, headers, queryParams = {}) {
  let query = `
    SELECT 
      p.*,
      c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;
  
  const conditions = [];
  const values = [];
  
  // Filter by category if specified
  if (queryParams.category_id) {
    conditions.push('p.category_id = $' + (values.length + 1));
    values.push(queryParams.category_id);
  }
  
  // Filter by active status if specified
  if (queryParams.active !== undefined) {
    conditions.push('p.active = $' + (values.length + 1));
    values.push(queryParams.active === 'true');
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY c.display_order, p.display_order, p.name';
  
  const result = await client.query(query, values);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      products: result.rows,
      count: result.rows.length
    })
  };
}

async function createProduct(client, headers, data) {
  const { name, category_id, price, description, display_order = 0, active = true } = data;
  
  if (!name || !category_id || price === undefined || price === null) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Name, category_id, and price are required' })
    };
  }

  // Validate category exists
  const categoryCheck = await client.query('SELECT id FROM categories WHERE id = $1', [category_id]);
  if (categoryCheck.rows.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Category does not exist' })
    };
  }

  const query = `
    INSERT INTO products (name, category_id, price, description, display_order, active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const result = await client.query(query, [name, category_id, price, description, display_order, active]);
  
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      product: result.rows[0],
      message: 'Product created successfully'
    })
  };
}

async function updateProduct(client, headers, data, productId) {
  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Product ID is required' })
    };
  }

  const { name, category_id, price, description, display_order, active } = data;
  
  // Validate category exists if category_id is being updated
  if (category_id) {
    const categoryCheck = await client.query('SELECT id FROM categories WHERE id = $1', [category_id]);
    if (categoryCheck.rows.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Category does not exist' })
      };
    }
  }
  
  const query = `
    UPDATE products 
    SET name = $1, category_id = $2, price = $3, description = $4, display_order = $5, active = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  
  const result = await client.query(query, [name, category_id, price, description, display_order, active, productId]);
  
  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Product not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      product: result.rows[0],
      message: 'Product updated successfully'
    })
  };
}

async function deleteProduct(client, headers, productId) {
  if (!productId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Product ID is required' })
    };
  }

  const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
  const result = await client.query(query, [productId]);
  
  if (result.rows.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Product not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Product deleted successfully',
      deletedProduct: result.rows[0]
    })
  };
}