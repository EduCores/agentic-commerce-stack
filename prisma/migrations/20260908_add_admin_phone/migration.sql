-- Agrega teléfono WhatsApp del equipo a AdminUser (sincroniza botón flotante del admin).
-- Seguro y no destructivo: solo agrega columna nullable si no existe.
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "phone" TEXT;
