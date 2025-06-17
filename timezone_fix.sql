-- Updated SQL functions to properly handle Indian timezone

-- Update the existing functions to handle IST timezone properly
CREATE OR REPLACE FUNCTION add_upload_record(
    p_file_name TEXT,
    p_records_count INTEGER DEFAULT 0,
    p_data_download_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_id INTEGER;
    ist_upload_date TIMESTAMPTZ;
    ist_download_date TIMESTAMPTZ;
BEGIN
    -- Set upload date to current IST time
    ist_upload_date := NOW() AT TIME ZONE 'Asia/Kolkata';
    
    -- Convert download date to IST if provided
    IF p_data_download_date IS NOT NULL THEN
        ist_download_date := p_data_download_date AT TIME ZONE 'Asia/Kolkata';
    ELSE
        ist_download_date := NULL;
    END IF;
    
    INSERT INTO data_dates (upload_date, file_name, records_count, data_download_date)
    VALUES (ist_upload_date, p_file_name, p_records_count, ist_download_date)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Update download date function to handle IST properly
CREATE OR REPLACE FUNCTION update_download_date(
    p_id INTEGER,
    p_data_download_date TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
    ist_download_date TIMESTAMPTZ;
BEGIN
    -- Convert the provided date to IST
    ist_download_date := p_data_download_date AT TIME ZONE 'Asia/Kolkata';
    
    UPDATE data_dates 
    SET data_download_date = ist_download_date
    WHERE id = p_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create a view that shows dates in IST for easier querying
CREATE OR REPLACE VIEW data_dates_ist AS
SELECT 
    id,
    upload_date AT TIME ZONE 'Asia/Kolkata' AS upload_date_ist,
    data_download_date AT TIME ZONE 'Asia/Kolkata' AS data_download_date_ist,
    file_name,
    records_count,
    upload_date as upload_date_utc,
    data_download_date as data_download_date_utc
FROM data_dates;

-- Function to get latest upload with proper IST formatting
CREATE OR REPLACE FUNCTION get_latest_upload_ist()
RETURNS TABLE(
    id INTEGER,
    upload_date_ist TEXT,
    data_download_date_ist TEXT,
    file_name TEXT,
    records_count INTEGER
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        d.id,
        TO_CHAR(d.upload_date AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as upload_date_ist,
        CASE 
            WHEN d.data_download_date IS NOT NULL 
            THEN TO_CHAR(d.data_download_date AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS')
            ELSE NULL 
        END as data_download_date_ist,
        d.file_name,
        d.records_count
    FROM data_dates d
    ORDER BY d.upload_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql; 