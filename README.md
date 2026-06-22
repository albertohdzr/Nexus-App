# Nexus-App

Aplicacion Next.js para CRM, admisiones, agenda, chats y configuracion del bot. En produccion se hostea en Vercel.

## Responsabilidad de la app

- UI del CRM y operacion de admisiones.
- Autenticacion con Supabase Auth.
- Lectura/escritura de leads, chats, mensajes, citas, roles y configuracion.
- Envio manual de mensajes y media de WhatsApp via `Nexus-Chatbot`.
- Gestion de plantillas de WhatsApp usando Meta Graph API.
- Notificaciones por email si `RESEND_API_KEY` esta configurado.

## Requisitos

- Node.js 20 o superior.
- npm.
- Proyecto Supabase compartido con `Nexus-Chatbot`.
- Vercel para el despliegue productivo.
- Servicio `Nexus-Chatbot` desplegado en Render.

## Variables de entorno

Variables requeridas:

```env
NEXT_PUBLIC_APP_URL=https://<vercel-app-domain>
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-publishable-or-anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_MEDIA_BUCKET=whatsapp-media
CHAT_API_URL=https://<render-chatbot>.onrender.com
API_SECRET=<same-api-secret-used-in-nexus-chatbot>
WHATSAPP_ACCESS_TOKEN=<meta-whatsapp-token>
WHATSAPP_VERIFY_TOKEN=<same-token-configured-in-meta>
```

Variables opcionales segun modulos activos:

```env
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL="Nexus <notificaciones@tu-dominio.com>"
OPENAI_API_KEY=<openai-api-key>
```

Notas:

- `CHAT_API_URL` debe apuntar a Render, no a localhost en produccion.
- `API_SECRET` debe coincidir con el valor configurado en Render para `Nexus-Chatbot`.
- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en server actions y rutas API. No lo expongas como `NEXT_PUBLIC`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` puede ser la publishable key o anon key del proyecto.

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Crea `.env.local` en la raiz del repo:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<supabase-publishable-or-anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_MEDIA_BUCKET=whatsapp-media
CHAT_API_URL=http://127.0.0.1:8000
API_SECRET=<same-api-secret-as-local-chatbot>
WHATSAPP_ACCESS_TOKEN=<meta-whatsapp-token>
WHATSAPP_VERIFY_TOKEN=<verify-token>
```

Levanta Next.js:

```bash
npm run dev
```

Abre:

```text
http://localhost:3000
```

Si quieres probar acciones de chat localmente, levanta tambien `Nexus-Chatbot` en `http://127.0.0.1:8000`.

## Supabase

La app usa el mismo proyecto Supabase que el chatbot. Desde este repo puedes vincular y aplicar migraciones:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

La Edge Function importante para WhatsApp es:

```text
supabase/functions/process-whatsapp-queue
```

Despliegala con:

```bash
supabase functions deploy process-whatsapp-queue --no-verify-jwt
```

Secretos requeridos para la Edge Function:

```bash
supabase secrets set \
  APP_BASE_URL="https://<render-chatbot>.onrender.com" \
  CRON_SECRET="<same-cron-secret-as-render>" \
  SUPABASE_URL="https://<project-ref>.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

`APP_BASE_URL` debe apuntar al chatbot en Render. La Edge Function no llama a Vercel para procesar mensajes de WhatsApp.

## Despliegue en Vercel

Importa este repo/carpeta en Vercel con preset de Next.js.

Configuracion:

- Install command: `npm install`.
- Build command: `npm run build`.
- Output: automatico de Vercel.
- Environment variables: las listadas arriba.

Despues del deploy, actualiza:

- `NEXT_PUBLIC_APP_URL` con el dominio final de Vercel.
- `CHAT_API_URL` con el dominio final de Render.

## Conexion con Nexus-Chatbot

La app llama al chatbot para acciones protegidas de WhatsApp:

```text
POST <CHAT_API_URL>/whatsapp/send/*
POST <CHAT_API_URL>/whatsapp/send/media
```

Todas esas llamadas usan:

```text
X-Api-Key: <API_SECRET>
```

Si los mensajes manuales fallan con `System Chat API secret not configured`, falta `API_SECRET` en Vercel o local.

## Configuracion de WhatsApp en el CRM

En la pantalla de configuracion de la organizacion, completa:

- `phone_number_id`: Phone Number ID de WhatsApp.
- `whatsapp_business_account_id`: WABA ID para crear y sincronizar templates.

El token de Meta requerido para llamadas Graph API se configura como:

```env
WHATSAPP_ACCESS_TOKEN=<meta-whatsapp-token>
```

## Scripts

```bash
npm run dev    # servidor local
npm run build  # build de produccion
npm run start  # servir build localmente
npm run lint   # eslint
```

Scripts utiles adicionales:

```bash
node scripts/smoke-atomic-booking.mjs
node scripts/seed-requirement-pdfs.mjs
```

Estos scripts requieren variables de Supabase con permisos de service role.

## Verificacion antes de deploy

```bash
npm run lint
npm run build
```

Checklist:

- Vercel tiene `CHAT_API_URL=https://<render-chatbot>.onrender.com`.
- Vercel y Render comparten el mismo `API_SECRET`.
- Supabase tiene las migraciones aplicadas.
- `process-whatsapp-queue` esta desplegada y apunta a Render con `APP_BASE_URL`.
- La organizacion tiene `phone_number_id` y, si usas templates, `whatsapp_business_account_id`.

## Estructura

```text
Nexus-App/
  src/app/              # rutas Next.js, server actions y API routes
  src/components/       # componentes compartidos
  src/features/         # modulos de CRM, leads, citas y notificaciones
  src/lib/              # clientes, helpers y servicios
  supabase/
    functions/          # process-whatsapp-queue
    migrations/         # schema compartido
  scripts/              # utilidades de seed/smoke
  package.json
```
