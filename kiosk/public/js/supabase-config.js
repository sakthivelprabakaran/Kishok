/* Public Supabase config for the browser.
 *
 * Anon / publishable key is safe in the browser (RLS protects data).
 * Never put SERVICE_ROLE / secret keys or Google Client Secret here.
 */
export const SUPABASE_URL = 'https://xsydhbvuerdvngzuflef.supabase.co';
// Classic anon JWT (preferred for Auth + PostgREST from the browser)
export const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeWRoYnZ1ZXJkdm5nenVmbGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NDA0OTMsImV4cCI6MjEwMzMxNjQ5M30.yX0bO6-qoXDPwkaD_-aaf-RU6d7UdKLx5-LJFtdliSk';
