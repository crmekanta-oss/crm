-- Safe SQL Migration Script: Refactor funnels table
DO $$ 
BEGIN
    -- 1. Remove unnecessary columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='company') THEN
        ALTER TABLE funnels DROP COLUMN company;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='stage') THEN
        ALTER TABLE funnels DROP COLUMN stage;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='billed_amount') THEN
        ALTER TABLE funnels DROP COLUMN billed_amount;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='billed_date') THEN
        ALTER TABLE funnels DROP COLUMN billed_date;
    END IF;

    -- 2. Rename columns only if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='contact') THEN
        ALTER TABLE funnels RENAME COLUMN contact TO name;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='quote_no') THEN
        ALTER TABLE funnels RENAME COLUMN quote_no TO order_number;
    END IF;

    -- 3. Ensure required fields have NOT NULL constraints
    -- (Only if the columns exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='name') THEN
        ALTER TABLE funnels ALTER COLUMN name SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='lead_source') THEN
        ALTER TABLE funnels ALTER COLUMN lead_source SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='next_follow_up') THEN
        ALTER TABLE funnels ALTER COLUMN next_follow_up SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='funnels' AND column_name='created_by') THEN
        ALTER TABLE funnels ALTER COLUMN created_by SET NOT NULL;
    END IF;

END $$;
