-- 002 · A thread is a concern with a state (miadisabelle/asterion#20, A50)
--
-- D12: a thread is a concern someone opens and others follow until it ends.
-- D13: it stores one of six states. D17: the keeper's own word for the state
-- is kept beside it in state_note, so nothing the keeper wrote is lost.
-- supersedes and split_from point at the thread this one replaced or came from.
-- Every column is nullable: a keeper that says nothing leaves it empty, and
-- no state is invented for it.
--
-- Idempotent: replaying it changes nothing.

ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS state_note text;
ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS supersedes uuid;
ALTER TABLE asterion.narrative_threads ADD COLUMN IF NOT EXISTS split_from uuid;
ALTER TABLE asterion.narrative_threads ADD CONSTRAINT narrative_threads_state_check CHECK (state IS NULL OR state IN ('emerging', 'active', 'resolved', 'deferred', 'blocked', 'superseded'));
ALTER TABLE asterion.narrative_threads ADD CONSTRAINT narrative_threads_supersedes_fkey FOREIGN KEY (supersedes) REFERENCES asterion.narrative_threads(id) ON DELETE SET NULL;
ALTER TABLE asterion.narrative_threads ADD CONSTRAINT narrative_threads_split_from_fkey FOREIGN KEY (split_from) REFERENCES asterion.narrative_threads(id) ON DELETE SET NULL;
