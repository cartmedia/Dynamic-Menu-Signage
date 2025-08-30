# Auth0 Authentication Setup - Team Pinas Signage

Complete guide voor het configureren van Auth0 authenticatie voor de admin dashboard.

## 🎯 **Overzicht**

De Team Pinas Signage admin interface is nu beveiligd met Auth0 authenticatie:

- ✅ **Login/Logout** via Auth0
- ✅ **JWT Token Verificatie** voor alle admin endpoints  
- ✅ **Development Mode** voor lokaal testen zonder Auth0 setup
- ✅ **User Info Display** met avatar en logout button
- ✅ **Automatic Token Refresh** en session management

## 🚀 **Quick Setup Guide**

### **Optie 1: Development Mode (Standaard)**
Voor lokaal testen zonder Auth0 setup:
- Laat Auth0 environment variables leeg in `.env`
- Admin interface werkt direct met "fake login"
- Admin endpoints zijn toegankelijk zonder authenticatie
- Perfect voor development en testing

### **Optie 2: Production Setup (Met Auth0)**
Voor productie deployment met echte authenticatie:
1. Volg Auth0 setup stappen hieronder
2. Configureer environment variables in `.env` of Netlify
3. Authentication werkt automatisch

## 📋 **Auth0 Configuration**

### **1. Maak Auth0 Account**
1. Ga naar [auth0.com](https://auth0.com) 
2. Maak gratis account aan
3. Klik "Create Application"

### **2. Application Settings**
```
Name: Team Pinas Signage Admin
Application Type: Single Page Application
Technology: Vanilla JavaScript
```

### **3. Application URLs**
```
Allowed Callback URLs:
http://localhost:8080/admin.html,https://your-site.netlify.app/admin.html

Allowed Logout URLs: 
http://localhost:8080,https://your-site.netlify.app

Allowed Web Origins:
http://localhost:8080,https://your-site.netlify.app

Allowed Origins (CORS):
http://localhost:8080,https://your-site.netlify.app
```

### **4. API Setup**
1. Ga naar "APIs" in Auth0 dashboard
2. Klik "Create API"
3. Settings:
   ```
   Name: Team Pinas Admin API
   Identifier: team-pinas-admin
   Signing Algorithm: RS256
   ```

### **5. User Management** (Optioneel)
1. Ga naar "Users & Roles"
2. Maak admin users aan
3. Optioneel: maak "admin" role voor extra security

## 🔧 **Code Configuration**

### **Environment Variables (.env file)**
Voor lokale development, voeg toe aan je `.env` file:

```bash
# Auth0 Configuration (Optional - leave empty for development mode)
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_AUDIENCE=team-pinas-admin
```

### **Production Environment Variables**
Voor production deployment (Netlify dashboard):

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id  
AUTH0_AUDIENCE=team-pinas-admin

# Neon Database (al configured)
NEON_DATABASE_URL=postgresql://...
```

## 🌐 **Deployment Options**

### **Local Development**
```bash
# Update admin.html met je Auth0 credentials
# Of laat default voor development mode
npm run dev
```

### **Netlify Production**
1. Set environment variables in Netlify dashboard
2. Deploy normaal via GitHub/CLI
3. Auth0 callbacks worden automatisch gehandled

## 🔐 **Security Features**

### **JWT Token Verification**
```javascript
// Alle admin API calls zijn beveiligd:
- /api/admin-categories
- /api/admin-products  
- /api/admin-settings
```

### **Automatic Session Management**
```javascript
// Auth systeem handled automatisch:
✅ Token storage (localStorage)
✅ Token expiration checking  
✅ Automatic logout on expired tokens
✅ Session persistence across page reloads
```

### **CORS Protection**
```javascript
// Alleen toegestaan van:
- localhost:8080 (development)
- your-site.netlify.app (production)
```

## 🔄 **Automatische Configuratie**

### **Hoe het werkt**
```javascript
// Configuratie wordt automatisch geladen van server
/.netlify/functions/auth-config
↓
// Development mode als geen Auth0 env vars
if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
  developmentMode = true;
} else {
  // Initialiseer echte Auth0
}
```

### **Development vs Production**
```bash
# Development (geen .env vars):
✅ Fake login -> Direct admin access
✅ No authentication required
✅ Perfect voor testing

# Production (met .env vars):
✅ Real Auth0 login flow  
✅ JWT token verification
✅ Secure admin access
```

## 🎨 **User Experience**

### **Login Flow**
1. User gaat naar `/admin.html`
2. Ziet login screen met Team Pinas logo
3. Klikt "Login with Auth0"
4. Auth0 Universal Login
5. Redirect terug naar admin dashboard

### **User Info Display**
```html
<!-- Header toont -->
<img src="user-avatar.jpg" />
<div>
  <div>User Name</div>  
  <div>user@email.com</div>
</div>
<button>Logout</button>
```

## 🐛 **Troubleshooting**

### **Development Mode Issues**
```javascript
// If Auth0 not configured:
console.log('Development mode - skipping authentication');
// Admin interface works without login
```

### **Production Auth Issues**
```bash
# Check browser console for:
- "Auth0 SDK not loaded"
- "Invalid domain/client ID"  
- "CORS errors"
```

### **API Authentication Errors**
```bash
# Common issues:
- Missing Authorization header
- Expired JWT token
- Wrong Auth0 audience
- CORS configuration
```

## 📊 **Testing Authentication**

### **Development Test**
```bash
# Without Auth0 setup:
curl http://localhost:8080/api/admin-categories
# Returns: categories data (development mode)
```

### **Production Test** 
```bash
# With Auth0 setup:
curl http://localhost:8080/api/admin-categories
# Returns: {"error": "No authorization header provided"}

# With valid token:
curl -H "Authorization: Bearer jwt-token" http://localhost:8080/api/admin-categories  
# Returns: categories data
```

## 🔄 **Migration from Development to Production**

1. **Setup Auth0** (volg bovenstaande stappen)
2. **Update admin.html** met je Auth0 credentials  
3. **Set Netlify environment variables**
4. **Deploy**
5. **Test login flow**

## 📞 **Support**

### **Auth0 Issues**
- Auth0 Documentation: [docs.auth0.com](https://docs.auth0.com)
- Community Forum: [community.auth0.com](https://community.auth0.com)

### **Implementation Issues**  
- Check browser console for errors
- Verify Auth0 configuration matches code
- Test in incognito mode to avoid cache issues

## ✨ **Advanced Features**

### **Role-Based Access** (Toekomstig)
```javascript
// In auth-middleware.js kun je roles toevoegen:
if (!decoded['https://teampinas.nl/roles']?.includes('admin')) {
  return { success: false, error: 'Insufficient permissions' };
}
```

### **Multi-Tenant Support** (Toekomstig)
```javascript
// Verschillende Auth0 tenants per environment
const domain = process.env.NODE_ENV === 'production' 
  ? 'prod-tenant.auth0.com' 
  : 'dev-tenant.auth0.com';
```

**Je admin interface is nu volledig beveiligd en productie-klaar! 🎉**