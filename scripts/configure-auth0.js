#!/usr/bin/env node
/**
 * Auth0 Configuration Script
 * Automatically configures Auth0 application settings using Management API
 */

const https = require('https');

// Configuration
const AUTH0_DOMAIN = 'dev-5vpwwiap2walwv0r.eu.auth0.com';
const CLIENT_ID = 'YwK0ooC7TkXXE904WUS5CUHMsnPx0fNP';
const PRODUCTION_URL = 'https://tp-signage.netlify.app';

// You need to create a Machine-to-Machine application in Auth0 dashboard
// and get these credentials (or use existing ones with Management API scope)
const MANAGEMENT_CLIENT_ID = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
const MANAGEMENT_CLIENT_SECRET = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;

if (!MANAGEMENT_CLIENT_ID || !MANAGEMENT_CLIENT_SECRET) {
  console.error('❌ Missing Auth0 Management API credentials');
  console.error('Set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET environment variables');
  console.error('\nTo get these:');
  console.error('1. Go to https://manage.auth0.com/dashboard/applications');
  console.error('2. Create a Machine-to-Machine application');
  console.error('3. Authorize it for Auth0 Management API');
  console.error('4. Grant scopes: read:clients, update:clients');
  process.exit(1);
}

// Get Management API access token
async function getManagementToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: MANAGEMENT_CLIENT_ID,
      client_secret: MANAGEMENT_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials'
    });

    const options = {
      hostname: AUTH0_DOMAIN,
      port: 443,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error('Failed to get access token: ' + data));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Update Auth0 application configuration
async function updateAppConfig(accessToken) {
  return new Promise((resolve, reject) => {
    const updateData = JSON.stringify({
      callbacks: [`${PRODUCTION_URL}/admin.html`],
      web_origins: [PRODUCTION_URL],
      allowed_logout_urls: [`${PRODUCTION_URL}/admin.html`],
      allowed_origins: [PRODUCTION_URL],
      grant_types: ['implicit', 'authorization_code', 'refresh_token'],
      app_type: 'spa' // Single Page Application
    });

    const options = {
      hostname: AUTH0_DOMAIN,
      port: 443,
      path: `/api/v2/clients/${CLIENT_ID}`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Auth0 application configured successfully');
          console.log('Settings updated:');
          console.log(`- Callback URL: ${PRODUCTION_URL}/admin.html`);
          console.log(`- Web Origins: ${PRODUCTION_URL}`);
          console.log(`- Logout URL: ${PRODUCTION_URL}/admin.html`);
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(updateData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    console.log('🔧 Configuring Auth0 application...');
    console.log(`Domain: ${AUTH0_DOMAIN}`);
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log();

    console.log('1. Getting Management API token...');
    const token = await getManagementToken();
    console.log('✅ Token obtained');

    console.log('2. Updating application configuration...');
    await updateAppConfig(token);
    
    console.log();
    console.log('🎉 Auth0 configuration complete!');
    console.log('You can now test Auth0 login at: https://tp-signage.netlify.app/admin.html');
    
  } catch (error) {
    console.error('❌ Configuration failed:', error.message);
    process.exit(1);
  }
}

main();