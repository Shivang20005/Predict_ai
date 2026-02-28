import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://okciyywrzolkrrpapenn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY2l5eXdyem9sa3JycGFwZW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NDY3OTQsImV4cCI6MjA4NzUyMjc5NH0.J_NX1CByRf7pbkI1luA-HjU_jZE3QkOfLv7pmDMysls';

export const supabase = createClient(supabaseUrl, supabaseKey);
