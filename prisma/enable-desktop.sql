-- Libera o app desktop (flagDesktopSync) para todas as organizações.
-- One-off: rodar em produção uma vez. Não faz parte das migrações.
UPDATE "Tenant" SET "flagDesktopSync" = true;
