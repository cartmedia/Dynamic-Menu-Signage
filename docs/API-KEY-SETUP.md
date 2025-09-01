# API Key Authentication Setup

Dit document beschrijft hoe je API key authenticatie instelt voor de Team Pinas Signage admin interface.

## Overzicht

Het systeem gebruikt een eenvoudige API key authenticatie in plaats van Auth0. Dit is eenvoudiger op te zetten en te beheren voor kleinere teams.

## Setup Stappen

### 1. Environment Variables Configureren

**Voor lokale development:**
1. Zorg dat je `.env` bestand de volgende regel bevat:
   ```bash
   ADMIN_API_KEY=team-pinas-admin-2024
   ```

**Voor productie (Netlify):**
1. Ga naar je Netlify dashboard
2. Navigeer naar Site settings > Environment variables
3. Voeg toe:
   - **Key:** `ADMIN_API_KEY`
   - **Value:** Een veilige, willekeurige string (bijvoorbeeld: `tp_2024_secure_admin_key_xyz123`)

### 2. Veilige API Key Genereren

Voor productie gebruik altijd een sterke, willekeurige API key:

```bash
# Genereer een veilige key (macOS/Linux)
openssl rand -hex 32

# Of gebruik een online generator
# https://www.uuidgenerator.net/api/guid
```

### 3. Admin Interface Toegang

1. Ga naar `/admin.html`
2. Voer je API key in
3. De sessie blijft 24 uur geldig
4. Na 24 uur moet je opnieuw inloggen

## Beveiliging

### Best Practices

- **Deel de API key nooit** in code repositories
- **Gebruik verschillende keys** voor development en productie  
- **Roteer keys regelmatig** (bijvoorbeeld maandelijks)
- **Gebruik sterke, willekeurige keys** van minimaal 32 karakters

### Hoe het werkt

1. **Client-side:** API key wordt opgeslagen in localStorage voor 24 uur
2. **Server-side:** Netlify functie `verify-api-key` valideert de key
3. **API calls:** Alle admin API calls bevatten `X-API-Key` header
4. **Expiratie:** Na 24 uur moet de gebruiker opnieuw inloggen

## Troubleshooting

### "Invalid API Key" foutmelding
- Controleer of `ADMIN_API_KEY` correct is ingesteld in environment variables
- Zorg dat er geen extra spaties of karakters in de key staan
- Voor Netlify: herstart je deployment na het toevoegen van environment variables

### Admin interface laadt niet
- Controleer browser console voor JavaScript errors
- Zorg dat alle Netlify functions correct zijn gedeployed
- Test de `/.netlify/functions/verify-api-key` endpoint handmatig

### API calls falen
- Controleer of de API key header correct wordt verstuurd
- Zorg dat de Netlify functions toegang hebben tot environment variables
- Check Netlify function logs voor server-side errors

## API Key Rotatie

Om je API key te wijzigen:

1. **Update environment variables** (zowel lokaal als Netlify)
2. **Redeploy** je applicatie
3. **Informeer gebruikers** over de nieuwe key
4. **Test** dat alles nog werkt

## Development vs Production

### Development
- Gebruik een simpele, herkenbare key zoals `team-pinas-admin-2024`
- Key staat in `.env` bestand (niet in git)

### Production  
- Gebruik een sterke, willekeurige key van 32+ karakters
- Key staat alleen in Netlify environment variables
- Roteer maandelijks voor extra beveiliging