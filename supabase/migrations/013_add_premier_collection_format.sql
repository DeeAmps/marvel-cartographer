-- Add premier_collection to the edition_format enum
-- Marvel Premier Collection launched in 2025 as a new budget-friendly 6x9 paperback line
ALTER TYPE edition_format ADD VALUE IF NOT EXISTS 'premier_collection';
