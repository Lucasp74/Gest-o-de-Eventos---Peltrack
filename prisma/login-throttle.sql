-- Tabela do rate limit de login (anti-brute-force por e-mail + IP).
-- Rode em PRODUÇÃO antes do deploy do código:
--   npx prisma db execute --schema prisma/schema.prisma --url "<PROD_DATABASE_URL>" --file prisma/login-throttle.sql
CREATE TABLE IF NOT EXISTS "LoginThrottle" (
  "key"         TEXT PRIMARY KEY,
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
