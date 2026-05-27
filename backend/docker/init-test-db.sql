SELECT 'CREATE DATABASE licitai_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'licitai_test')\gexec
