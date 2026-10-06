-- 001 · A beat held by a thread (miadisabelle/asterion#11)
--
-- A beat used to belong to a tension only. A turn spoken in a ceremony belongs
-- to the ceremony's thread and to no tension, so a beat may now be held by a
-- thread instead. Every beat is held by one or the other, or both.
--
-- Idempotent: replaying it changes nothing.

ALTER TABLE asterion.narrative_beats ADD COLUMN IF NOT EXISTS thread_id uuid;
ALTER TABLE asterion.narrative_beats ALTER COLUMN tension_id DROP NOT NULL;
ALTER TABLE asterion.narrative_beats ADD CONSTRAINT narrative_beats_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES asterion.narrative_threads(id) ON DELETE CASCADE;
ALTER TABLE asterion.narrative_beats ADD CONSTRAINT narrative_beats_held_check CHECK (tension_id IS NOT NULL OR thread_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_narrative_beats_thread ON asterion.narrative_beats USING btree (thread_id);
