import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnrjinfhbulmwjretzin.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZucmppbmZoYnVsbXdqcmV0emluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MjUyNDYsImV4cCI6MjA3ODAwMTI0Nn0.qYim041LkJa6C6ezSLS3Zdo0WwGCc02m7-z-2FODVww'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

