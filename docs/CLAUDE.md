# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `npm run dev` - Starts Netlify dev server on port 8080
- **Deploy**: `npm run deploy` - Deploys to production via Netlify
- **Build**: No build step required - this is a static site with server-side functions

## Project Architecture

Team Pinas Signage is a digital menu board system with CMS integration using Neon database and Auth0 authentication.

### Core Components

**Frontend Display System (`index.html` + `js/MenuSignage.js`)**
- Self-contained digital signage display optimized for 16:9 screens
- Dutch locale clock and date display
- Automatic category rotation with pagination for large menus
- Binary search algorithm for optimal item fitting based on screen real estate
- Responsive design using viewport units (`vh`) for consistent scaling
- Semantic CSS classes: `.CategorySlot`, `.CategoryTitle`, `.DisplayContainer`, `.DisplayGrid`

**CMS Integration Layer**
- `js/cms-connector.js`: API connector with offline fallback and caching
- `config/cms-config.js`: Configuration for Neon database endpoints
- `assets/products.json`: Fallback data source when CMS is unavailable
- Automatic refresh mechanism with reconnection event handling

**Admin Interface (`admin.html`)**
- Full-featured management dashboard with dark mode support
- API key authentication for secure access
- Category and product CRUD operations
- Real-time statistics and data visualization
- Tailwind CSS for responsive design

**Backend API (`netlify/functions/`)**
- Serverless functions for CMS API endpoints
- Neon PostgreSQL database integration
- JWT token validation and user management

### Key Architectural Patterns

**Data Flow**: CMS API → Cache Layer → Display Components
- Primary: Fetch from Neon database via Netlify functions
- Secondary: Use cached data from localStorage
- Fallback: Load static JSON data

**Display Logic**: 
- Primary slot rendering with overflow detection
- Binary search for maximum items per screen
- Font loading awareness for accurate measurements
- Automatic cache invalidation on window resize

**Authentication Flow**:
- Simple API key authentication
- 24-hour session storage in localStorage
- Server-side key validation via Netlify functions

### Environment Configuration

**Required Environment Variables**:
- `NEON_DATABASE_URL`: PostgreSQL connection string
- `ADMIN_API_KEY`: Secure API key for admin access

**Local Development**:
- Copy `.env.example` to `.env` and configure values
- Set a secure `ADMIN_API_KEY` for admin access
- API key is validated server-side for security

### File Structure

- `/`: Main HTML files and configuration
- `/docs/`: All documentation files (README, setup guides, etc.)
- `/js/`: Core JavaScript modules
- `/css/`: Styling and visual assets
- `/config/`: CMS and application configuration
- `/netlify/functions/`: Serverless API endpoints
- `/assets/`: Images, logos, and fallback data
- `/sql/`: Database schema definitions

### Database Schema

The system expects categories and products tables with proper relationships. Refer to `sql/` directory for schema definitions.

### Development Workflow

1. Start with `npm run dev` for local development
2. Admin interface accessible at `/admin.html`
3. Main display at root URL
4. API endpoints available at `/api/*` routes
5. Changes auto-reload during development

### Special Considerations

- Font loading timing affects display measurements - code accounts for this
- Binary search algorithm optimizes screen utilization
- Offline-first design with graceful degradation
- Dark mode support throughout admin interface
- Dutch locale formatting for dates and currency