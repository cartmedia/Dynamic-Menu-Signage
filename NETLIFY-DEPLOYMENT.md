# Team Pinas Signage - Netlify + Neon Deployment

Complete gids voor het deployen van de signage op Netlify met Neon database.

## 🚀 Quick Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-username/team-pinas-signage)

## 📋 Prerequisites

1. **Neon Database Account** - [console.neon.tech](https://console.neon.tech)
2. **Netlify Account** - [netlify.com](https://netlify.com)
3. **GitHub Repository** (optioneel, voor automatische deployments)

## 🏗️ Neon Database Setup

### 1. Maak een Neon project aan

```sql
-- Maak de tabellen aan in je Neon database
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE signage_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Voeg sample data toe

```sql
-- Sample categories
INSERT INTO categories (name, display_order) VALUES
('Snacks', 1),
('Frisdrank & Water', 2), 
('Koffie & Thee', 3),
('Energy & Sportdrank', 4);

-- Sample products
INSERT INTO products (category_id, name, price, display_order) VALUES
(1, 'M&M', 1.40, 1),
(1, 'Popcorn', 1.65, 2),
(1, 'Chips Naturel', 1.65, 3),
(2, 'Cola', 2.65, 1),
(2, 'Fanta', 2.65, 2),
(3, 'Koffie', 2.15, 1),
(3, 'Cappuccino', 2.65, 2);

-- Sample settings
INSERT INTO signage_settings (setting_key, setting_value, data_type) VALUES
('refresh_interval', '30000', 'number'),
('footer_text', 'Investeer in jezelf - personal training vanaf €37,50', 'string'),
('show_clock', 'true', 'boolean');
```

### 3. Kopieer connection string

1. Ga naar je Neon dashboard
2. Klik op "Connect" 
3. Kopieer de connection string (lijkt op: `postgresql://username:password@hostname/database`)

## 🚀 Netlify Deployment

### Optie A: GitHub (Aanbevolen)

1. **Push naar GitHub**
   ```bash
   git add .
   git commit -m "Add Netlify + Neon deployment setup"
   git push origin feature/cms-integration
   ```

2. **Connect op Netlify**
   - Ga naar [netlify.com](https://netlify.com)
   - Klik "New site from Git"
   - Selecteer je repository
   - Build settings zijn automatisch correct (dankzij `netlify.toml`)

### Optie B: Direct Upload

1. **Installeer Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login en deploy**
   ```bash
   netlify login
   netlify init
   netlify deploy --prod
   ```

### Environment Variables Instellen

1. Ga naar je Netlify site dashboard
2. Klik "Site settings" > "Environment variables"  
3. Voeg toe:
   ```
   Key: NEON_DATABASE_URL
   Value: [je-neon-connection-string]
   ```

4. **Deploy opnieuw** om environment variables te activeren:
   ```bash
   netlify deploy --prod
   ```

## 🧪 Lokale Development

### 1. Setup

```bash
# Clone repository
git clone https://github.com/your-repo/team-pinas-signage
cd team-pinas-signage

# Install dependencies  
npm install

# Copy environment template
cp .env.example .env
```

### 2. Configure .env

```bash
# Edit .env file
NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require
```

### 3. Start development server

```bash
# Start Netlify dev environment (includes Functions)
npm run dev

# Of direct via netlify CLI
netlify dev
```

Je site is nu beschikbaar op `http://localhost:8080`

## 🔧 API Endpoints

Na deployment zijn deze endpoints beschikbaar:

- `https://your-site.netlify.app/api/products` - Producten & categorieën
- `https://your-site.netlify.app/api/settings` - Signage instellingen

### Test API endpoints:

```bash
# Test products endpoint
curl https://your-site.netlify.app/api/products

# Test settings endpoint  
curl https://your-site.netlify.app/api/settings
```

## 🎛️ CMS Beheer

### Via SQL (Neon Console)

```sql
-- Nieuwe categorie toevoegen
INSERT INTO categories (name, display_order) VALUES ('Nieuwe Categorie', 5);

-- Product bijwerken
UPDATE products SET price = 2.50 WHERE name = 'Cola';

-- Product deactiveren (verbergen)
UPDATE products SET active = false WHERE name = 'Oud Product';

-- Instellingen aanpassen
UPDATE signage_settings 
SET setting_value = '60000' 
WHERE setting_key = 'refresh_interval';
```

### Via Neon Dashboard

1. Ga naar [console.neon.tech](https://console.neon.tech)
2. Selecteer je project
3. Klik "SQL Editor"  
4. Voer SQL queries uit om data aan te passen

## 📊 Monitoring

### Netlify Functions Logs
- Ga naar Netlify dashboard
- Klik "Functions" tab
- Bekijk logs per function call

### Database Monitoring  
- Neon dashboard toont query performance
- Monitor connection counts en resource usage

## 🐛 Troubleshooting

### API 500 Errors
```bash
# Check Netlify function logs
netlify functions:list
netlify functions:invoke products --no-identity
```

### Database Connection Issues
1. Controleer `NEON_DATABASE_URL` environment variable
2. Test connection string in Neon SQL Editor
3. Check of database actief is (niet in sleep mode)

### Cache Issues
```javascript
// Clear cache via browser console
const connector = new CMSConnector();
connector.clearCache();
location.reload();
```

### CORS Issues
- Netlify Functions hebben CORS al geconfigureerd
- Check browser network tab voor exacte error

## 🔄 Updates & Maintenance  

### Database Schema Updates
```sql
-- Voeg nieuwe kolommen toe
ALTER TABLE products ADD COLUMN description TEXT;

-- Update bestaande data
UPDATE products SET description = 'Heerlijke snack' WHERE category_id = 1;
```

### Code Updates
```bash
# Voor GitHub deployments
git add .
git commit -m "Update signage features" 
git push origin main
# Netlify deployt automatisch

# Voor directe deployments  
netlify deploy --prod
```

### Scheduled Backups
- Neon maakt automatisch backups
- Download backups via Neon dashboard indien nodig

## 🎯 Performance Tips

1. **Database Indexing**
   ```sql
   CREATE INDEX idx_products_category ON products(category_id);
   CREATE INDEX idx_categories_active ON categories(active);
   ```

2. **Cache Headers** (al geconfigureerd in Functions)
3. **Image Optimization** - gebruik moderne formaten (WebP, AVIF)
4. **CDN** - Netlify CDN is automatisch actief

## 🔐 Security

- Neon connections zijn SSL-encrypted
- Environment variables zijn veilig opgeslagen op Netlify  
- API endpoints hebben CORS protection
- Geen database credentials in frontend code

## 📞 Support

- **Neon Issues**: [docs.neon.tech](https://docs.neon.tech)
- **Netlify Issues**: [docs.netlify.com](https://docs.netlify.com)
- **Code Issues**: Check browser console en Netlify function logs