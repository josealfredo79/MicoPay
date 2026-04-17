-- MicoPay Agents Table
-- Para tener un mapa real como Uber

CREATE TABLE IF NOT EXISTS agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address VARCHAR(56) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(30) NOT NULL, -- 'tienda', 'farmacia', 'restaurant', 'otro'
  address         TEXT NOT NULL,
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  available_mxn   INTEGER DEFAULT 5000,
  max_trade_mxn   INTEGER DEFAULT 3000,
  min_trade_mxn   INTEGER DEFAULT 100,
  tier            VARCHAR(20) DEFAULT 'activo', -- 'espora', 'activo', 'experto', 'maestro'
  reputation      DECIMAL(3, 2) DEFAULT 0.80,
  completion_rate DECIMAL(3, 2) DEFAULT 0.90,
  trades_completed INTEGER DEFAULT 0,
  online          BOOLEAN DEFAULT true,
  usdc_rate       DECIMAL(10, 6) DEFAULT 0.0575,
  phone           VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas geográficas
CREATE INDEX idx_agents_location ON agents (latitude, longitude);
CREATE INDEX idx_agents_online ON agents (online, available_mxn);
CREATE INDEX idx_agents_tier ON agents (tier);

-- Insertar agentes de ejemplo (CDMX)
INSERT INTO agents (stellar_address, name, type, address, latitude, longitude, available_mxn, tier, reputation, completion_rate, trades_completed) VALUES
('GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN', 'Farmacia Guadalupe', 'farmacia', 'Orizaba 45, Roma Norte, CDMX', 19.4195, -99.1627, 5000, 'maestro', 0.95, 0.98, 312),
('GDAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A', 'Tienda Don Pepe', 'tienda', 'Av. Álvaro Obregón 120, Roma Norte, CDMX', 19.4150, -99.1680, 3000, 'experto', 0.90, 0.93, 156),
('GCF3CJXADZKIODEGZHTBQKPAGMO5KYVW6SLJ3J5GBQZDIFHGT7ZZQMFB', 'Papelería La Central', 'papeleria', 'Col. Condesa, CDMX', 19.4100, -99.1700, 2000, 'activo', 0.69, 0.88, 45),
('GA2M5JZC5T4K6P7Q8R9S0T1U2V3W4X5Y6Z', 'Farmacia Simi', 'farmacia', 'Av. Insurgentes 500, CDMX', 19.4250, -99.1600, 8000, 'maestro', 0.96, 0.99, 520),
('GB3N4K5L6M7N8P9Q0R1S2T3U4V5W6X7Y', 'OXXO Centro', 'tienda', 'Calle Juárez 100, Centro, CDMX', 19.4320, -99.1500, 4000, 'experto', 0.88, 0.91, 230);

-- Función para buscar agentes cercanos (radio en km)
CREATE OR REPLACE FUNCTION get_nearby_agents(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km INTEGER DEFAULT 5,
  amount_mxn INTEGER DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  type VARCHAR,
  address TEXT,
  distance_km DECIMAL(6, 2),
  available_mxn INTEGER,
  max_trade_mxn INTEGER,
  tier VARCHAR,
  reputation DECIMAL,
  completion_rate DECIMAL,
  trades_completed INTEGER,
  online BOOLEAN,
  usdc_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.type,
    a.address,
    (6371 * acos(cos(radians(a.latitude)) * cos(radians(user_lat)) * 
     cos(radians(user_lng) - radians(a.longitude)) + 
     sin(radians(a.latitude)) * sin(radians(user_lat))))::DECIMAL(6,2) AS distance_km,
    a.available_mxn,
    a.max_trade_mxn,
    a.tier,
    a.reputation,
    a.completion_rate,
    a.trades_completed,
    a.online,
    a.usdc_rate
  FROM agents a
  WHERE a.online = true
    AND a.available_mxn >= amount_mxn
    AND a.max_trade_mxn >= amount_mxn
  ORDER BY distance_km ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;