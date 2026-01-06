-- audio_notes tablosunu oluştur
CREATE TABLE IF NOT EXISTS audio_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) etkinleştir
ALTER TABLE audio_notes ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri sil (varsa)
DROP POLICY IF EXISTS "Herkes sesli notları görebilir" ON audio_notes;
DROP POLICY IF EXISTS "Sadece baha ve aysenur sesli not ekleyebilir" ON audio_notes;
DROP POLICY IF EXISTS "Admin kullanıcılar sesli notları güncelleyebilir" ON audio_notes;
DROP POLICY IF EXISTS "Admin kullanıcılar sesli notları silebilir" ON audio_notes;

-- Herkes okuyabilir
CREATE POLICY "Herkes sesli notları görebilir"
  ON audio_notes
  FOR SELECT
  USING (true);

-- Sadece baha ve aysenur ekleyebilir
CREATE POLICY "Sadece baha ve aysenur sesli not ekleyebilir"
  ON audio_notes
  FOR INSERT
  WITH CHECK (
    author = 'baha' OR author = 'aysenur'
  );

-- Admin kullanıcılar güncelleyebilir
CREATE POLICY "Admin kullanıcılar sesli notları güncelleyebilir"
  ON audio_notes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admin kullanıcılar silebilir
CREATE POLICY "Admin kullanıcılar sesli notları silebilir"
  ON audio_notes
  FOR DELETE
  USING (true);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_audio_notes_author ON audio_notes(author);
CREATE INDEX IF NOT EXISTS idx_audio_notes_created_at ON audio_notes(created_at DESC);

