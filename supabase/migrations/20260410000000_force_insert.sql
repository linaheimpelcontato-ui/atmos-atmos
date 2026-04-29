CREATE OR REPLACE FUNCTION force_insert(table_name text, data jsonb)
RETURNS void AS $$
BEGIN
  SET session_replication_role = replica;
  EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(null::public.%I, $1) ON CONFLICT DO NOTHING', table_name, table_name) USING data;
  SET session_replication_role = DEFAULT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
