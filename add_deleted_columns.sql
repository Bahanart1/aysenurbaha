-- Tüm tablolara deleted kolonu ekle (soft delete için)
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

ALTER TABLE love_notes 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE audio_notes 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE visited_places 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE timeline_events 
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_love_notes_deleted ON love_notes(deleted);
CREATE INDEX IF NOT EXISTS idx_audio_notes_deleted ON audio_notes(deleted);
CREATE INDEX IF NOT EXISTS idx_visited_places_deleted ON visited_places(deleted);
CREATE INDEX IF NOT EXISTS idx_timeline_events_deleted ON timeline_events(deleted);

