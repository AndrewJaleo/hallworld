import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mgstqiwithuocfcytzrf.supabase.co";
// const supabaseUrl = "https://cniposhbxgcfqkwnrnhv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nc3RxaXdpdGh1b2NmY3l0enJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MTYzMDUsImV4cCI6MjA1ODM5MjMwNX0.M5p9OXB6X-8JkJeHYs37YypXeE4o5_ze_sYmEXSDsKs";
// const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaXBvc2hieGdjZnFrd25ybmh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NzQ3MjMsImV4cCI6MjA1NjA1MDcyM30.O2NKr-TZSFhTc2y1TiOMwUDn7r1JjVKxPaMvAysnKbU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
