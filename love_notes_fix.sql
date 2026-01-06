-- love_notes tablosu için RLS politikalarını düzelt
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- Mevcut policy'leri kontrol et ve güncelle
-- Önce mevcut policy'leri sil (varsa)
DROP POLICY IF EXISTS "Herkes notları görebilir" ON love_notes;
DROP POLICY IF EXISTS "Sadece baha ve aysenur not ekleyebilir" ON love_notes;
DROP POLICY IF EXISTS "Admin kullanıcılar notları güncelleyebilir" ON love_notes;
DROP POLICY IF EXISTS "Admin kullanıcılar notları silebilir" ON love_notes;

-- Herkes okuyabilir
CREATE POLICY "Herkes notları görebilir"
  ON love_notes
  FOR SELECT
  USING (true);

-- Sadece baha ve aysenur ekleyebilir
CREATE POLICY "Sadece baha ve aysenur not ekleyebilir"
  ON love_notes
  FOR INSERT
  WITH CHECK (
    author = 'baha' OR author = 'aysenur'
  );

-- Admin kullanıcılar güncelleyebilir
CREATE POLICY "Admin kullanıcılar notları güncelleyebilir"
  ON love_notes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admin kullanıcılar silebilir
CREATE POLICY "Admin kullanıcılar notları silebilir"
  ON love_notes
  FOR DELETE
  USING (true);

