-- One line per table (and materialized view) in public: "name count".
-- The cutover and rollback compare this output on both servers; any difference
-- stops them before traffic moves.
SELECT c.relname || ' ' ||
       (xpath('/row/n/text()',
              query_to_xml(format('SELECT count(*) AS n FROM %I.%I', n.nspname, c.relname),
                           false, true, '')))[1]::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind IN ('r', 'm')
 ORDER BY c.relname;
