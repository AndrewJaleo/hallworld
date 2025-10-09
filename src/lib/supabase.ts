import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mgstqiwithuocfcytzrf.supabase.co";
// const supabaseUrl = "https://cniposhbxgcfqkwnrnhv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eHB0aW9kZ2tvenhvcHJweHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NTg1ODcsImV4cCI6MjA3MTQzNDU4N30._ivRbjBACdV4BOokkOhuvohYMwKKR8X4zvSHMvWkt6w";
// const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaXBvc2hieGdjZnFrd25ybmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NzQ3MjMsImV4cCI6MjA1NjA1MDcyM30.O2NKr-TZSFhTc2y1TiOMwUDn7r1JjVKxPaMvAysnKbU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
