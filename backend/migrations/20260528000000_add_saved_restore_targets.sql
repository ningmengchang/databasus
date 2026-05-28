-- +goose Up
-- +goose StatementBegin

CREATE TABLE saved_restore_targets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,
    name            TEXT NOT NULL,
    database_type   TEXT NOT NULL,
    connection_data TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_restore_targets_user_id ON saved_restore_targets (user_id);

ALTER TABLE saved_restore_targets
    ADD CONSTRAINT fk_saved_restore_targets_user_id
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS saved_restore_targets;

-- +goose StatementEnd
