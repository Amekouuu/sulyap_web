-- Supabase publishes every table in the public schema through its own REST API.
-- Sulyap never uses that API: the browser talks only to our Express server, and the server
-- connects as the database owner, which is not affected by row level security.
-- Turning row level security on with no policies blocks that public API from reading any table.
ALTER TABLE jurisdictions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_jurisdictions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE classification_criteria   ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_criteria      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_images        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_verification_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsement_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE prohibited_terms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE known_destinations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations         ENABLE ROW LEVEL SECURITY;
