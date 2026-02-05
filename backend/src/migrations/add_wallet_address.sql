-- Migration: Add walletAddress column to User table for SUI wallet login
-- Run this migration to enable wallet-based authentication

-- Check if column exists before adding
SET @dbname = DATABASE();
SET @tablename = 'User';
SET @columnname = 'walletAddress';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT "Column walletAddress already exists"',
  'ALTER TABLE User ADD COLUMN walletAddress VARCHAR(66) NULL UNIQUE AFTER email'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_user_wallet ON User(walletAddress);
