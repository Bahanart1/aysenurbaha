-- visited_places tablosunu oluştur
CREATE TABLE IF NOT EXISTS visited_places (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  username TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) etkinleştir
ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri sil (varsa)
DROP POLICY IF EXISTS "Herkes yerleri görebilir" ON visited_places;
DROP POLICY IF EXISTS "Sadece baha ve aysenur ekleyebilir" ON visited_places;
DROP POLICY IF EXISTS "Admin kullanıcılar silebilir" ON visited_places;

-- Herkes okuyabilir
CREATE POLICY "Herkes yerleri görebilir"
  ON visited_places
  FOR SELECT
  USING (true);

-- Sadece baha ve aysenur ekleyebilir
CREATE POLICY "Sadece baha ve aysenur ekleyebilir"
  ON visited_places
  FOR INSERT
  WITH CHECK (
    username = 'baha' OR username = 'aysenur'
  );

-- Sadece admin rolüne sahip kullanıcılar silebilir (baha ve aysenur admin rolüne sahip)
-- Not: Silme işlemi frontend'de admin kontrolü ile yapılıyor
CREATE POLICY "Admin kullanıcılar silebilir"
  ON visited_places
  FOR DELETE
  USING (true);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_visited_places_username ON visited_places(username);
CREATE INDEX IF NOT EXISTS idx_visited_places_created_at ON visited_places(created_at DESC);

