-- Sulyap database schema.
-- Mirrors Appendix I (ERD) and Appendix J (Data Dictionary) of the manuscript.
-- Fields listed as "ENUM" in the data dictionary are VARCHAR columns with CHECK constraints,
-- which are easier to change later than PostgreSQL enum types.

-- Trigram matching for the similar-name duplicate check.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Keeps updated_at current on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Checks that a user-id column points to a user with the expected role.
-- Usage: EXECUTE FUNCTION assert_user_role('column_name', 'role').
CREATE OR REPLACE FUNCTION assert_user_role() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  ref_id integer := (to_jsonb(NEW) ->> TG_ARGV[0])::integer;
  ref_role text;
BEGIN
  IF ref_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT role INTO ref_role FROM users WHERE user_id = ref_id;
  IF ref_role IS DISTINCT FROM TG_ARGV[1] THEN
    RAISE EXCEPTION '%.% must reference a user with the % role', TG_TABLE_NAME, TG_ARGV[0], TG_ARGV[1]
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------- Jurisdictions
CREATE TABLE jurisdictions (
  jurisdiction_id SERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL UNIQUE,
  type            VARCHAR(50)  NOT NULL CHECK (type IN ('province', 'city', 'municipality')),
  province        VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------------- Users
CREATE TABLE users (
  user_id                     SERIAL PRIMARY KEY,
  full_name                   VARCHAR(150) NOT NULL,
  email                       VARCHAR(255) NOT NULL,
  email_verified              BOOLEAN      NOT NULL DEFAULT false,
  email_verified_at           TIMESTAMPTZ,
  contact_number              VARCHAR(13),
  home_address                VARCHAR(255),
  address_latitude            NUMERIC(10, 8),
  address_longitude           NUMERIC(11, 8),
  id_type                     VARCHAR(100),
  id_document_url             VARCHAR(255),
  account_verification_status VARCHAR(20)
    CHECK (account_verification_status IN ('pending', 'verified', 'rejected')),
  verified_by                 INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
  verified_at                 TIMESTAMPTZ,
  newsletter_opt_in           BOOLEAN      NOT NULL DEFAULT false,
  password_hash               VARCHAR(255) NOT NULL,
  role                        VARCHAR(20)  NOT NULL
    CHECK (role IN ('registered_user', 'administrator', 'tourism_officer')),
  account_status              VARCHAR(20)  NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended')),
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Registered Users must give a contact number. The home address is optional: it is asked for
  -- (an address or a pin on the map) the first time they use Nearby Lesser-Known.
  CONSTRAINT users_registered_user_contact CHECK (
    role <> 'registered_user' OR contact_number IS NOT NULL
  ),
  -- Home coordinates are stored as a pair.
  CONSTRAINT users_home_coordinates_pair CHECK (
    (address_latitude IS NULL) = (address_longitude IS NULL)
  ),
  -- ID verification applies to Registered Users only.
  CONSTRAINT users_id_verification_registered_only CHECK (
    role = 'registered_user' OR account_verification_status IS NULL
  )
);

-- E-mail addresses are unique regardless of letter case.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_verified_by_role BEFORE INSERT OR UPDATE OF verified_by ON users
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('verified_by', 'administrator');

-- One officer may cover several jurisdictions; one jurisdiction may have several officers.
CREATE TABLE officer_jurisdictions (
  officer_id      INTEGER     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  jurisdiction_id INTEGER     NOT NULL REFERENCES jurisdictions (jurisdiction_id),
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (officer_id, jurisdiction_id)
);
CREATE INDEX officer_jurisdictions_jurisdiction_idx ON officer_jurisdictions (jurisdiction_id);
CREATE TRIGGER officer_jurisdictions_officer_role BEFORE INSERT OR UPDATE ON officer_jurisdictions
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('officer_id', 'tourism_officer');

-- Only a hash of each e-mail verification token is stored.
CREATE TABLE email_verification_tokens (
  token_id   SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  used_at    TIMESTAMPTZ
);
CREATE INDEX email_verification_tokens_user_idx ON email_verification_tokens (user_id);

-- ---------------------------------------------------------------- Destinations
CREATE TABLE destinations (
  destination_id     SERIAL PRIMARY KEY,
  jurisdiction_id    INTEGER      NOT NULL REFERENCES jurisdictions (jurisdiction_id),
  -- Null only for administrator-seeded records created outside the nomination workflow.
  submitted_by       INTEGER      REFERENCES users (user_id) ON DELETE SET NULL,
  name               VARCHAR(150) NOT NULL,
  description        TEXT         NOT NULL,
  season_tag         VARCHAR(10)  CHECK (season_tag IN ('Rainy', 'Summer')),
  location           VARCHAR(255) NOT NULL,
  latitude           NUMERIC(10, 8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude          NUMERIC(11, 8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  -- Free text such as 'Free' or 'P30-P50'. Display only.
  entrance_fee       VARCHAR(100),
  best_time_to_visit VARCHAR(255),
  operating_hours    VARCHAR(255),
  safety_reminders   TEXT,
  workflow_status    VARCHAR(30)  NOT NULL DEFAULT 'draft' CHECK (workflow_status IN (
    'draft', 'pending_verification', 'returned', 'pending_endorsement', 'endorsed', 'rejected'
  )),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX destinations_status_idx ON destinations (workflow_status);
CREATE INDEX destinations_jurisdiction_idx ON destinations (jurisdiction_id);
CREATE INDEX destinations_submitted_by_idx ON destinations (submitted_by);
CREATE INDEX destinations_name_trgm_idx ON destinations USING gin (name gin_trgm_ops);
CREATE TRIGGER destinations_set_updated_at BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE categories (
  category_id   SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT         NOT NULL
);

CREATE TABLE destination_categories (
  destination_id INTEGER NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  category_id    INTEGER NOT NULL REFERENCES categories (category_id),
  PRIMARY KEY (destination_id, category_id)
);
CREATE INDEX destination_categories_category_idx ON destination_categories (category_id);

-- ---------------------------------------------------------------- Classification
CREATE TABLE classification_criteria (
  criterion_id   SERIAL PRIMARY KEY,
  criterion_name VARCHAR(150) NOT NULL UNIQUE,
  description    TEXT         NOT NULL
);

CREATE TABLE destination_criteria (
  destination_id           INTEGER NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  criterion_id             INTEGER NOT NULL REFERENCES classification_criteria (criterion_id),
  notes                    TEXT,
  evidence                 TEXT,
  assessment_status        VARCHAR(20) NOT NULL DEFAULT 'not_assessed'
    CHECK (assessment_status IN ('not_assessed', 'met', 'not_met')),
  google_maps_review_count INTEGER CHECK (google_maps_review_count >= 0),
  tripadvisor_review_count INTEGER CHECK (tripadvisor_review_count >= 0),
  observed_at              DATE,
  assessed_by              INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
  assessed_at              TIMESTAMPTZ,
  is_draft                 BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (destination_id, criterion_id),
  -- Review counts belong to the first criterion only (criterion_id 1 is seeded as the review-count criterion).
  CONSTRAINT destination_criteria_counts_first_only CHECK (
    criterion_id = 1 OR (google_maps_review_count IS NULL AND tripadvisor_review_count IS NULL)
  )
);
CREATE TRIGGER destination_criteria_assessor_role BEFORE INSERT OR UPDATE OF assessed_by ON destination_criteria
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('assessed_by', 'tourism_officer');

-- ---------------------------------------------------------------- Community contributions
CREATE TABLE reviews (
  review_id         SERIAL PRIMARY KEY,
  destination_id    INTEGER     NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  user_id           INTEGER     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  rating            INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text       TEXT,
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'removed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_destination_idx ON reviews (destination_id, moderation_status);
CREATE INDEX reviews_user_idx ON reviews (user_id);
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER reviews_user_role BEFORE INSERT OR UPDATE OF user_id ON reviews
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('user_id', 'registered_user');

CREATE TABLE destination_images (
  image_id          SERIAL PRIMARY KEY,
  destination_id    INTEGER      NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  user_id           INTEGER      NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  -- Set when the photo was attached to a review; null for photos submitted with a nomination.
  review_id         INTEGER      REFERENCES reviews (review_id) ON DELETE CASCADE,
  is_primary        BOOLEAN      NOT NULL DEFAULT false,
  image_url         VARCHAR(500) NOT NULL,
  caption           TEXT,
  moderation_status VARCHAR(20)  NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'removed')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX destination_images_destination_idx ON destination_images (destination_id);
CREATE INDEX destination_images_review_idx ON destination_images (review_id);
-- At most one primary photo per destination.
CREATE UNIQUE INDEX destination_images_one_primary ON destination_images (destination_id) WHERE is_primary;
CREATE TRIGGER destination_images_user_role BEFORE INSERT OR UPDATE OF user_id ON destination_images
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('user_id', 'registered_user');

-- ---------------------------------------------------------------- Workflow logs
CREATE TABLE admin_verification_logs (
  verification_id     SERIAL PRIMARY KEY,
  destination_id      INTEGER     NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  administrator_id    INTEGER     NOT NULL REFERENCES users (user_id),
  -- Also records an administrator returning or rejecting an already endorsed destination after a report.
  verification_status VARCHAR(20) NOT NULL CHECK (verification_status IN ('verified', 'returned', 'rejected')),
  remarks             TEXT,
  verified_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_verification_logs_destination_idx ON admin_verification_logs (destination_id, verified_at);
CREATE TRIGGER admin_verification_logs_admin_role BEFORE INSERT OR UPDATE ON admin_verification_logs
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('administrator_id', 'administrator');

CREATE TABLE endorsement_logs (
  endorsement_id     SERIAL PRIMARY KEY,
  destination_id     INTEGER     NOT NULL REFERENCES destinations (destination_id) ON DELETE CASCADE,
  tourism_officer_id INTEGER     NOT NULL REFERENCES users (user_id),
  endorsement_status VARCHAR(20) NOT NULL CHECK (endorsement_status IN ('endorsed', 'returned', 'rejected')),
  remarks            TEXT,
  endorsed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX endorsement_logs_destination_idx ON endorsement_logs (destination_id, endorsed_at);
CREATE TRIGGER endorsement_logs_officer_role BEFORE INSERT OR UPDATE ON endorsement_logs
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('tourism_officer_id', 'tourism_officer');

-- ---------------------------------------------------------------- Reports
CREATE TABLE reports (
  report_id      SERIAL PRIMARY KEY,
  reported_by    INTEGER     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  review_id      INTEGER     REFERENCES reviews (review_id) ON DELETE CASCADE,
  image_id       INTEGER     REFERENCES destination_images (image_id) ON DELETE CASCADE,
  destination_id INTEGER     REFERENCES destinations (destination_id) ON DELETE CASCADE,
  reason         TEXT        NOT NULL,
  report_status  VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (report_status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at    TIMESTAMPTZ,
  resolved_by    INTEGER     REFERENCES users (user_id) ON DELETE SET NULL,
  -- A report points at exactly one item: a review, a photo, or a destination.
  CONSTRAINT reports_exactly_one_target CHECK (num_nonnulls(review_id, image_id, destination_id) = 1)
);
CREATE INDEX reports_status_idx ON reports (report_status, created_at);
CREATE TRIGGER reports_reporter_role BEFORE INSERT OR UPDATE OF reported_by ON reports
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('reported_by', 'registered_user');
CREATE TRIGGER reports_resolver_role BEFORE INSERT OR UPDATE OF resolved_by ON reports
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('resolved_by', 'administrator');

-- ---------------------------------------------------------------- Notifications
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id         INTEGER     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL CHECK (type IN (
    'account_verification', 'new_nomination', 'routed_nomination',
    'endorsement', 'returned', 'rejected', 'removed'
  )),
  message         TEXT        NOT NULL,
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------- Screening lists
CREATE TABLE prohibited_terms (
  term_id    SERIAL PRIMARY KEY,
  term       VARCHAR(255) NOT NULL,
  language   VARCHAR(20)  NOT NULL CHECK (language IN ('english', 'filipino', 'kapampangan')),
  added_by   INTEGER      NOT NULL REFERENCES users (user_id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX prohibited_terms_unique ON prohibited_terms (lower(term), language);
CREATE TRIGGER prohibited_terms_admin_role BEFORE INSERT OR UPDATE OF added_by ON prohibited_terms
  FOR EACH ROW EXECUTE FUNCTION assert_user_role('added_by', 'administrator');

CREATE TABLE known_destinations (
  known_destination_id SERIAL PRIMARY KEY,
  name                 VARCHAR(150) NOT NULL,
  jurisdiction_id      INTEGER      NOT NULL REFERENCES jurisdictions (jurisdiction_id),
  source               VARCHAR(255) NOT NULL,
  latitude             NUMERIC(10, 8),
  longitude            NUMERIC(11, 8),
  added_by             INTEGER      NOT NULL REFERENCES users (user_id),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX known_destinations_jurisdiction_idx ON known_destinations (jurisdiction_id);
CREATE INDEX known_destinations_name_trgm_idx ON known_destinations USING gin (name gin_trgm_ops);
