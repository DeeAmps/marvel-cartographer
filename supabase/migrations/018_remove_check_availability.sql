-- Migration 018: Remove check_availability usage
-- Updates all editions with check_availability to in_print.
-- The enum value remains in the type (PostgreSQL doesn't easily support
-- removing enum values with many dependents), but no data uses it.

UPDATE collected_editions
SET print_status = 'in_print'
WHERE print_status = 'check_availability';

-- Also update any print_status_history rows
UPDATE print_status_history
SET new_status = 'in_print'
WHERE new_status = 'check_availability';

UPDATE print_status_history
SET old_status = 'in_print'
WHERE old_status = 'check_availability';
