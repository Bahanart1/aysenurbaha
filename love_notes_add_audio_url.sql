-- love_notes tablosuna audio_url kolonu ekle
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- audio_url kolonunu ekle (eğer yoksa)
ALTER TABLE love_notes 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Kolonun nullable olduğundan emin ol
ALTER TABLE love_notes 
ALTER COLUMN audio_url DROP NOT NULL;

