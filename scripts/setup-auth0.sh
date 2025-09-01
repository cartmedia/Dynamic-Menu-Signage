#!/bin/bash
# Auth0 Setup Helper Script

echo "🔧 Auth0 Configuration Setup"
echo "============================="
echo
echo "First, create Management API credentials:"
echo "1. Go to: https://manage.auth0.com/dashboard/applications"
echo "2. Click 'Create Application'"
echo "3. Name: 'Team Pinas Management'"  
echo "4. Type: 'Machine to Machine Applications'"
echo "5. API: 'Auth0 Management API'"
echo "6. Scopes: 'read:clients' and 'update:clients'"
echo
echo "Then run this script with your Management API credentials:"
echo

# Check if credentials are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <MANAGEMENT_CLIENT_ID> <MANAGEMENT_CLIENT_SECRET>"
    echo
    echo "Example:"
    echo "  $0 abc123... xyz789..."
    exit 1
fi

MANAGEMENT_CLIENT_ID=$1
MANAGEMENT_CLIENT_SECRET=$2

echo "Setting environment variables..."
export AUTH0_MANAGEMENT_CLIENT_ID=$MANAGEMENT_CLIENT_ID
export AUTH0_MANAGEMENT_CLIENT_SECRET=$MANAGEMENT_CLIENT_SECRET

echo "Running Auth0 configuration script..."
node scripts/configure-auth0.js

if [ $? -eq 0 ]; then
    echo
    echo "✅ Configuration complete!"
    echo "Auth0 login should now work at: https://tp-signage.netlify.app/admin.html"
else
    echo "❌ Configuration failed"
    exit 1
fi