-- Migration: 029_drop_client_feedback
-- Description: Remove the Client Satisfaction Measurement (CSM) feature. Drops the
--   client_feedback table introduced in 025. The feedback survey, manual-encoding
--   form, and CSM reporting were retired from the application.
-- Created: 2026-07-16

BEGIN;

DROP TABLE IF EXISTS client_feedback;

COMMIT;
