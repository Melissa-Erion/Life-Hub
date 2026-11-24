/* Public settings. The anon key is safe to publish: row-level security limits every
   request to the signed-in user's own rows. Never put a service_role key here. */
window.LIFEHUB_CONFIG = {
  SUPABASE_URL: "https://fclhcizewxiiwqbyfnmo.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbGhjaXpld3hpaXdxYnlmbm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNzI4NjIsImV4cCI6MjExMDk0ODg2Mn0.as1CowPRj16D5KPnTY9_dw6dlGWT2ElxXdCTh-g_Z6s",
  /* Public half of the notification signing key. The private half stays on the server. */
  VAPID_PUBLIC_KEY: "BFwr7mQWHveiez7HbryQGkvpfW58bsw2YcoVrsYxrRv-zPiI965wWyZV5XauG8mngFBrDt9PweJjLOwSg5dvMsU"
};
