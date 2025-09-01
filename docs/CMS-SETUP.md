# Team Pinas Signage - CMS Integratie Setup

Deze handleiding legt uit hoe je de CMS-integratie instelt om de signage te koppelen aan een Neon database.

## Overzicht

De signage ondersteunt nu zowel statische JSON bestanden als een dynamische CMS via API. Het systeem valt automatisch terug op lokale bestanden als de CMS niet beschikbaar is.

## Quick Setup

### 1. Configureer je CMS API

Bewerk `config/cms-config.js`:

```javascript
const CMS_CONFIG = {
  api: {
    // Vervang met je Neon database API endpoint
    baseUrl: 'https://your-neon-db-api.com/api',
    endpoints: {
      products: '/products',
      categories: '/categories', 
      settings: '/signage-settings'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-api-key' // Voeg toe indien nodig
    }
  }
  // ... rest van configuratie
};
```

### 2. Stel environment variabelen in (optioneel)

```bash
export CMS_API_URL=https://your-neon-db-api.com/api
```

### 3. Test de integratie

Open `index.html` in je browser en controleer de browser console voor CMS-verbindingsberichten.

## Neon Database Schema

Je Neon database moet de volgende JSON structuur ondersteunen:

### Products Endpoint (`/api/products`)

```json
{
  "categories": [
    {
      "title": "Snacks",
      "items": [
        {
          "name": "M&M",
          "price": 1.40
        },
        {
          "name": "Popcorn", 
          "price": 1.65
        }
      ]
    }
  ]
}
```

### Alternatieve formaten

Het systeem kan ook deze formaten converteren:

#### Array van categorieën:
```json
[
  {
    "name": "Snacks",
    "products": [
      {"name": "M&M", "price": 1.40}
    ]
  }
]
```

#### Enkele categorie:
```json
{
  "name": "Snacks",
  "items": [
    {"name": "M&M", "cost": 1.40}
  ]
}
```

## Configuratie Opties

### API Settings
- `baseUrl`: De basis URL van je CMS API
- `endpoints`: API endpoints voor verschillende data types
- `headers`: Authentication en andere HTTP headers

### Refresh Settings
- `interval`: Hoe vaak naar updates wordt gekeken (30 seconden default)
- `retryInterval`: Tijd tussen retry pogingen (10 seconden)
- `maxRetries`: Maximum aantal retry pogingen (3)

### Cache Settings
- `enabled`: Cache API responses lokaal (true)
- `duration`: Cache duurtijd (5 minuten default)
- `storageKey`: LocalStorage key voor cache persistence

### Fallback Settings
- `useLocalFallback`: Gebruik lokale JSON bij API failure (true)
- `localProductsPath`: Pad naar lokale products.json
- `localMenuPath`: Pad naar lokale Menu.json

## Real-time Updates

Het systeem controleert automatisch elke 30 seconden op updates:

- ✅ Naadloze transitions tussen oude en nieuwe content
- ✅ Automatische cache invalidatie
- ✅ Offline/online detection met auto-recovery
- ✅ Retry logic bij verbindingsproblemen

## Debugging

### Console Berichten
- `"Products loaded from CMS"` - Succesvol geladen van CMS
- `"Products loaded from cache"` - Geladen uit lokale cache
- `"Products loaded from local fallback"` - Fallback naar lokale JSON
- `"CMS data updated, refreshing display"` - Update gedetecteerd

### Cache Management

Programmatisch cache legen:
```javascript
const connector = new CMSConnector();
connector.clearCache();
```

### API Test

Test je API endpoint direct:
```bash
curl -H "Content-Type: application/json" \\
     -H "Authorization: Bearer your-api-key" \\
     https://your-neon-db-api.com/api/products
```

## Veelgestelde Vragen

**Q: Wat gebeurt er als de CMS niet beschikbaar is?**
A: Het systeem valt automatisch terug op de lokale `products.json` file.

**Q: Hoe vaak wordt er naar updates gekeken?**
A: Standaard elke 30 seconden, configureerbaar via `refresh.interval`.

**Q: Worden updates direct zichtbaar?**
A: Ja, zodra een update wordt gedetecteerd, wordt de display ververst.

**Q: Kan ik de cache uitschakelen?**
A: Ja, zet `cache.enabled` op `false` in de configuratie.

**Q: Ondersteunt het authentication?**
A: Ja, voeg je API key toe aan `api.headers.Authorization`.

## Ondersteuning

Voor vragen over de CMS-integratie, controleer de browser console voor error berichten en zorg dat je API endpoint de juiste JSON structuur retourneert.