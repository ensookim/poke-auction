-- Release migration checklist for the production PostgreSQL database.
-- Safe to run repeatedly: all column/table additions use IF NOT EXISTS.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS terms_agreed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS privacy_agreed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trade_policy_agreed_at TIMESTAMP;

ALTER TABLE auctions
    ADD COLUMN IF NOT EXISTS winner_id BIGINT,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'NONE',
    ADD COLUMN IF NOT EXISTS payment_amount BIGINT,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS shipping_company VARCHAR(100),
    ADD COLUMN IF NOT EXISTS received_confirmed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS received_confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;

ALTER TABLE chat_rooms
    ADD COLUMN IF NOT EXISTS seller_read_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS buyer_read_at TIMESTAMP;

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS user_push_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    platform VARCHAR(30),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    body VARCHAR(500),
    auction_id BIGINT,
    chat_room_id BIGINT,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
    ON app_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user
    ON user_push_tokens (user_id);

ALTER TABLE safety_reports
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_safety_reports_status_created
    ON safety_reports (status, created_at DESC);
