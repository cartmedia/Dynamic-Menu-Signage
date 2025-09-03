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
              'price', p.price,
              'display_order', p.display_order,
              'on_sale', COALESCE(p.on_sale, false),
              'is_new', COALESCE(p.is_new, false)
            ) ORDER BY COALESCE(p.display_order, 999), p.name
          ) as items
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id 
        WHERE c.active = true AND (p.active = true OR p.active IS NULL)
        GROUP BY c.id, c.name, c.display_order
        ORDER BY COALESCE(c.display_order, 999), c.name
      `;

      console.log('Executing categories query...');
      const result = await client.query(categoriesQuery);
      console.log(`Query returned ${result.rows.length} categories`);
      
      if (result.rows.length === 0) {
        console.warn('No categories found in database!');
      } else {
        console.log('Category names:', result.rows.map(r => r.category_title));
      }
      
      // Transform to expected format
      const categories = result.rows.map(row => ({
        title: row.category_title,
        display_order: row.display_order,
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
    
    // Return comprehensive fallback data instead of 500 error
    const fallbackData = {
      categories: [
        {
          title: "Shakes & Supplementen",
          display_order: 1,
          items: [
            { name: "Protein Shake Vanille", price: 4.50, display_order: 1, on_sale: true, is_new: false },
            { name: "Whey Protein Chocolade", price: 4.25, display_order: 2, on_sale: false, is_new: true },
            { name: "Massa Gainer", price: 5.00, display_order: 3, on_sale: false, is_new: false },
            { name: "Creatine Monohydraat", price: 2.75, display_order: 4, on_sale: true, is_new: false }
          ]
        },
        {
          title: "Snacks",
          display_order: 2,
          items: [
            { name: "Protein Bar Cookies", price: 2.50, display_order: 1, on_sale: false, is_new: true },
            { name: "Energy Nuts Mix", price: 1.75, display_order: 2, on_sale: true, is_new: false },
            { name: "Beef Jerky", price: 3.25, display_order: 3, on_sale: false, is_new: false },
            { name: "Gezonde Muesli Reep", price: 2.00, display_order: 4, on_sale: false, is_new: false }
          ]
        },
        {
          title: "Koude Dranken",
          display_order: 3,
          items: [
            { name: "Cola Zero", price: 2.00, display_order: 1, on_sale: false, is_new: false },
            { name: "Sportdrank Citroen", price: 2.25, display_order: 2, on_sale: true, is_new: false },
            { name: "Water Plat", price: 1.50, display_order: 3, on_sale: false, is_new: false },
            { name: "Ijsthee Perzik", price: 2.50, display_order: 4, on_sale: false, is_new: true }
          ]
        },
        {
          title: "Warme Dranken",
          display_order: 4,
          items: [
            { name: "Espresso", price: 1.75, display_order: 1, on_sale: false, is_new: false },
            { name: "Cappuccino", price: 2.25, display_order: 2, on_sale: false, is_new: false },
            { name: "Thee Earl Grey", price: 2.00, display_order: 3, on_sale: true, is_new: false },
            { name: "Warme Chocolademelk", price: 2.75, display_order: 4, on_sale: false, is_new: false }
          ]
        },
        {
          title: "Energy & Sportdrank",
          display_order: 5,
          items: [
            { name: "Red Bull", price: 2.75, display_order: 1, on_sale: false, is_new: false },
            { name: "Monster Energy", price: 2.50, display_order: 2, on_sale: true, is_new: false },
            { name: "PowerAde", price: 2.25, display_order: 3, on_sale: false, is_new: false },
            { name: "Pre-Workout", price: 3.50, display_order: 4, on_sale: false, is_new: true }
          ]
        },
        {
          title: "Broodjes & Warm",
          display_order: 6,
          items: [
            { name: "Broodje Gezond", price: 4.50, display_order: 1, on_sale: true, is_new: false },
            { name: "Tosti Ham/Kaas", price: 3.75, display_order: 2, on_sale: false, is_new: false },
            { name: "Wrap Kip Caesar", price: 5.25, display_order: 3, on_sale: false, is_new: true },
            { name: "Omelet Naturel", price: 4.00, display_order: 4, on_sale: false, is_new: false }
          ]
        }
      ],
      lastUpdated: new Date().toISOString(),
      source: 'fallback-comprehensive'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackData)
    };
  }
};