-- Team Pinas Signage Database Schema
-- Run this in your Neon database to set up the required tables

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signage settings table
CREATE TABLE IF NOT EXISTS signage_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, active);
CREATE INDEX IF NOT EXISTS idx_categories_active_order ON categories(active, display_order);
CREATE INDEX IF NOT EXISTS idx_products_order ON products(display_order);
CREATE INDEX IF NOT EXISTS idx_settings_active ON signage_settings(active);

-- Insert sample data
INSERT INTO categories (name, display_order, active) VALUES
('Snacks', 1, true),
('Frisdrank & Water', 2, true),
('Koffie & Thee', 3, true),
('Energy & Sportdrank', 4, true),
('Broodjes & Warm', 5, true),
('Shakes & Supplementen', 6, true)
ON CONFLICT DO NOTHING;

-- Insert sample products (matching your current products.json)
INSERT INTO products (category_id, name, price, display_order, active) VALUES
-- Snacks (category_id = 1)
(1, 'M&M', 1.40, 1, true),
(1, 'Popcorn', 1.65, 2, true),
(1, 'Chips Naturel', 1.65, 3, true),
(1, 'Chips Paprika', 1.65, 4, true),
(1, 'Snickers', 1.65, 5, true),
(1, 'Mars', 1.65, 6, true),
(1, 'Lion', 1.65, 7, true),
(1, 'Twix', 1.65, 8, true),
(1, 'KitKat', 1.65, 9, true),
(1, 'Bueno', 1.75, 10, true),
(1, 'Pringles', 2.00, 11, true),
(1, 'Mars 2x', 2.65, 12, true),
(1, 'Snickers 2x', 2.65, 13, true),
(1, 'Kitkat Chunky', 2.15, 14, true),
(1, 'Doritos', 2.15, 15, true),

-- Frisdrank & Water (category_id = 2)  
(2, 'Cola', 2.65, 1, true),
(2, 'Cola Zero', 2.65, 2, true),
(2, 'Fanta', 2.65, 3, true),
(2, '7up', 2.65, 4, true),
(2, 'Spa blauw', 2.65, 5, true),
(2, 'Lipton Sparkle', 2.45, 6, true),
(2, 'Lipton Green', 2.45, 7, true),
(2, 'Fristi', 2.65, 8, true),
(2, 'Fernandes Blauw', 2.45, 9, true),
(2, 'Fernandes Geel', 2.45, 10, true),
(2, 'Fernandes Rood', 2.45, 11, true),
(2, 'Fernandes Groen', 2.45, 12, true),
(2, 'CapriSonne', 1.50, 13, true),
(2, 'Aquarius klein', 2.45, 14, true),
(2, 'Aquarius groot', 3.45, 15, true),

-- Koffie & Thee (category_id = 3)
(3, 'Koffie', 2.15, 1, true),
(3, 'Thee', 1.95, 2, true),
(3, 'Cappuccino', 2.65, 3, true),
(3, 'Latte Macchiato', 3.25, 4, true),
(3, 'Espresso', 2.15, 5, true),
(3, 'Thee groot', 2.65, 6, true),
(3, 'Chocomelk met slagroom', 3.65, 7, true),
(3, 'Chocomelk', 2.65, 8, true),

-- Energy & Sportdrank (category_id = 4)
(4, 'Redbull', 3.65, 1, true),
(4, 'Energie drink', 2.15, 2, true),
(4, 'Flow Energy', 3.25, 3, true),
(4, 'AA groot', 3.65, 4, true),
(4, 'AA klein', 2.90, 5, true),
(4, 'Carnitine', 3.90, 6, true),

-- Broodjes & Warm (category_id = 5)
(5, 'Vlam Tosti', 3.90, 1, true),
(5, 'Broodje frikandel', 2.65, 2, true),
(5, 'Bami soep', 3.65, 3, true),
(5, 'Hema worst', 3.75, 4, true),

-- Shakes & Supplementen (category_id = 6)
(6, 'Proteineshake', 4.75, 1, true),
(6, 'Eiwitshake', 4.75, 2, true),
(6, 'OMEGA 3', 37.50, 3, true)
ON CONFLICT DO NOTHING;

-- Insert signage settings
INSERT INTO signage_settings (setting_key, setting_value, data_type, description, active) VALUES
('refresh_interval', '30000', 'number', 'How often to check for updates (milliseconds)', true),
('rotation_interval', '6000', 'number', 'Time between category rotations (milliseconds)', true),
('footer_text', 'Investeer in jezelf of in je kind – personal training vanaf €37,50 per les. Begin vandaag nog!', 'string', 'Scrolling footer text', true),
('show_clock', 'true', 'boolean', 'Display clock in header', true),
('cache_duration', '300000', 'number', 'Cache duration in milliseconds', true),
('max_retries', '3', 'number', 'Maximum API retry attempts', true),
('company_name', 'Team Pinas', 'string', 'Company name for branding', true),
('display_columns', '2', 'number', 'Number of columns to display (1 or 2)', true),
('header_height', '15', 'number', 'Header height in vh units', true),
('footer_height', '8', 'number', 'Footer height in vh units', true)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = CURRENT_TIMESTAMP;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();  
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON signage_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();