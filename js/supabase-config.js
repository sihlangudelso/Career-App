const SUPABASE_URL = "https://pedwhxgocwnksqnmdsza.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZHdoeGdvY3dua3Nxbm1kc3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzU0NzcsImV4cCI6MjEwNTIxMTQ3N30.PAeGGqbK5Mw14qGq-WFbubxHOYoG0aMEzM8wEzuEHKI";

const SUPABASE_NOT_CONFIGURED = SUPABASE_URL.startsWith('REPLACE_WITH');

const sb = SUPABASE_NOT_CONFIGURED ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
