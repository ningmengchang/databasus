-- +goose Up
-- +goose StatementBegin

ALTER TABLE backups
    ADD COLUMN description TEXT;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE backups
    DROP COLUMN description;

-- +goose StatementEnd
