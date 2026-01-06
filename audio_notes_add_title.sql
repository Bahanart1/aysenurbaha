-- audio_notes tablosuna title kolonu ekle
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- title kolonunu ekle (eğer yoksa)
ALTER TABLE audio_notes 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Kolonun nullable olduğundan emin ol
ALTER TABLE audio_notes 
ALTER COLUMN title DROP NOT NULL;

