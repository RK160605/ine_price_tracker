import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  mockStoreUrl: process.env.MOCK_STORE_URL || "https://demo.inelabteamdev.com",
  cronSecret: process.env.CRON_SECRET || "ine-scrape-cron-secret-2026",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "",
  playwrightChannel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  isProduction: process.env.NODE_ENV === "production"
};
