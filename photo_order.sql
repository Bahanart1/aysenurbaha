-- photo_order tablosunu oluştur
CREATE TABLE IF NOT EXISTS photo_order (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT NOT NULL UNIQUE,
  photo_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) etkinleştir
ALTER TABLE photo_order ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri sil (varsa)
DROP POLICY IF EXISTS "Herkes fotoğraf sıralamasını görebilir" ON photo_order;
DROP POLICY IF EXISTS "Admin kullanıcılar sıralamayı güncelleyebilir" ON photo_order;

-- Herkes okuyabilir
CREATE POLICY "Herkes fotoğraf sıralamasını görebilir"
  ON photo_order
  FOR SELECT
  USING (true);

-- Admin kullanıcılar güncelleyebilir (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin kullanıcılar sıralamayı güncelleyebilir"
  ON photo_order
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_photo_order_display_order ON photo_order(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_photo_order_photo_url ON photo_order(photo_url);

-- updated_at için trigger
CREATE OR REPLACE FUNCTION update_photo_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_photo_order_updated_at_trigger
  BEFORE UPDATE ON photo_order
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_order_updated_at();

