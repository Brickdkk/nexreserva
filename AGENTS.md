# AGENTS.md — NexReserva

> **Mandato supremo**: el archivo `Negocios Digitales Rentables Sin Inversión.txt` (PRD) es la
> fuente de verdad absoluta para toda decisión de negocio, arquitectura y UI. Léelo completo antes
> de escribir cualquier código, especialmente la **Sección 6 (Mega-Prompt)**.

---

## 1. Identidad del Proyecto

NexReserva es un Micro-SaaS B2B de agendamiento de citas para el sector de servicios presenciales
en Chile (barberías, salones de belleza, clínicas veterinarias). Opera bajo dominio `.cl`.
Arquitectura Multi-Tenant: **Local → Sucursal → Profesional / Servicio / Cita**.

---

## 2. Stack Tecnológico (no negociable)

| Capa            | Tecnología                                      |
|-----------------|-------------------------------------------------|
| Framework       | Next.js (App Router) + TypeScript               |
| Estilos         | Tailwind CSS                                    |
| ORM             | Prisma                                          |
| Base de datos   | PostgreSQL                                      |
| WhatsApp        | Evolution API v2 (Docker, webhooks nativos)     |
| IA              | Vercel AI SDK — Claude 3.5 Haiku / GPT-4o-mini  |
| Infraestructura | docker-compose.yml en VPS de bajo costo         |
| Repositorio     | Monorepo único                                  |

---

## 3. Comandos de Instalación y Desarrollo

```bash
# Inicializar proyecto
npm init -y
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"

# Instalar dependencias principales
npm install prisma @prisma/client
npm install ai @ai-sdk/openai @ai-sdk/anthropic   # Vercel AI SDK
npm install node-cron
npm install zod

# Instalar dependencias de dev
npm install -D @types/node-cron prettier eslint-config-prettier

# Inicializar Prisma
npx prisma init --datasource-provider postgresql
```

---

## 4. Comandos de Build, Lint y Test

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build
npm run start

# Lint
npm run lint                        # ESLint con config de Next.js

# Formateo
npx prettier --write .

# --- Prisma ---
npx prisma generate                 # Generar Prisma Client (ejecutar tras cambios en schema)
npx prisma migrate dev              # Migraciones en desarrollo local
npx prisma migrate deploy           # Migraciones en VPS (producción)
npx prisma studio                   # UI visual para explorar la base de datos
npx prisma db seed                  # Sembrar datos de prueba (si existe prisma/seed.ts)

# --- Docker (PostgreSQL + Evolution API v2) ---
docker-compose up -d                # Levantar servicios en segundo plano
docker-compose down                 # Detener y eliminar contenedores
docker-compose logs -f              # Ver logs en tiempo real

# --- Tests ---
npm test                            # Correr todos los tests
npx jest path/to/file.test.ts       # Correr un archivo de test específico
npm test -- path/to/file.test.ts    # Alternativa con npm
npx jest -t "nombre del test"       # Correr un test por nombre/patrón
npx jest --watch                    # Modo watch interactivo
npx jest --coverage                 # Reporte de cobertura
```

---

## 5. Estructura de Archivos del Proyecto

```
/
├── app/
│   ├── layout.tsx                        # Root layout (fuente Inter/Montserrat, bg-white)
│   ├── page.tsx                          # Landing B2B: Hero + Pricing (Flujo 1)
│   ├── admin/
│   │   ├── page.tsx                      # Dashboard: finanzas, reportes, métricas (Flujo 2)
│   │   ├── sucursales/
│   │   │   └── page.tsx                  # CRUD de sucursales (genera slug automático)
│   │   ├── profesionales/
│   │   │   └── page.tsx                  # CRUD profesionales (valida límite 10/sucursal)
│   │   └── servicios/
│   │       └── page.tsx                  # CRUD servicios (nombre, duración, precio)
│   ├── profesional/
│   │   └── [id]/
│   │       └── page.tsx                  # Panel profesional: agenda + métricas (Flujo 3)
│   └── [slug]/
│       └── page.tsx                      # Reserva B2C pública por slug (Flujo 4)
├── api/
│   └── webhooks/
│       └── whatsapp/
│           └── route.ts                  # Webhook Evolution API — IA + cancelaciones (Flujo 5)
├── components/                           # Componentes UI reutilizables
│   ├── ui/                               # Botones, inputs, cards, modales
│   └── booking/                          # Componentes específicos del flujo de reserva
├── lib/
│   ├── prisma.ts                         # Singleton de PrismaClient
│   ├── google-calendar.ts                # Integración Google Calendar API
│   ├── evolution-api.ts                  # Cliente HTTP para Evolution API v2
│   ├── ai-agent.ts                       # Lógica del agente IA (Vercel AI SDK)
│   └── utils.ts                          # Utilidades (slugify, formatPrice, etc.)
├── prisma/
│   └── schema.prisma                     # Esquema de base de datos (ver Sección 7)
├── cron.ts                               # node-cron: recordatorios 24h vía WhatsApp
├── docker-compose.yml                    # PostgreSQL + Evolution API v2
├── .env                                  # Variables de entorno (nunca commitear)
├── .env.example                          # Plantilla de variables (sí commitear)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Esquema de Base de Datos Prisma (Obligatorio)

El schema.prisma debe respetar exactamente esta jerarquía y campos (Sección 6, ítem 1 del PRD):

```prisma
model Local {
  id              String      @id @default(cuid())
  nombre          String
  evolution_token String
  sucursales      Sucursal[]
}

model Sucursal {
  id                   String        @id @default(cuid())
  local_id             String
  nombre               String
  slug                 String        @unique  // URL pública: nexreserva.cl/[slug]
  limite_profesionales Int           @default(10)
  local                Local         @relation(fields: [local_id], references: [id])
  profesionales        Profesional[]
  servicios            Servicio[]
  citas                Cita[]
}

model Profesional {
  id                String   @id @default(cuid())
  sucursal_id       String
  nombre            String
  foto_url          String
  telefono          String
  google_calendar_id String
  sucursal          Sucursal @relation(fields: [sucursal_id], references: [id])
  citas             Cita[]
}

model Servicio {
  id               String   @id @default(cuid())
  sucursal_id      String
  nombre           String
  duracion_minutos Int
  precio           Int      // CLP, sin decimales
  sucursal         Sucursal @relation(fields: [sucursal_id], references: [id])
  citas            Cita[]
}

enum EstadoCita {
  activa
  pagada
  cancelada_cliente
  cancelada_barbero
}

model Cita {
  id                  String     @id @default(cuid())
  sucursal_id         String
  profesional_id      String
  servicio_id         String
  cliente_telefono    String
  fecha_hora_inicio   DateTime
  fecha_hora_fin      DateTime
  estado              EstadoCita @default(activa)
  recordatorio_enviado Boolean   @default(false)
  sucursal            Sucursal   @relation(fields: [sucursal_id], references: [id])
  profesional         Profesional @relation(fields: [profesional_id], references: [id])
  servicio            Servicio   @relation(fields: [servicio_id], references: [id])
}
```

---

## 7. Convenciones de Código

### Imports (orden estricto, separados por línea en blanco)

```typescript
// 1. React / Next.js
import { Suspense } from "react";
import { redirect } from "next/navigation";

// 2. Librerías de terceros
import { generateText } from "ai";
import { z } from "zod";

// 3. Aliases internos (@/)
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/evolution-api";

// 4. Tipos (siempre con `import type`)
import type { Cita, EstadoCita } from "@prisma/client";
```

### Nomenclatura

| Elemento             | Convención   | Ejemplo                           |
|----------------------|--------------|-----------------------------------|
| Archivos/directorios | kebab-case   | `booking-form.tsx`, `lib/utils/`  |
| Componentes React    | PascalCase   | `BookingForm`, `PricingCard`      |
| Funciones/variables  | camelCase    | `fetchAvailability`, `citaData`   |
| Constantes           | UPPER_SNAKE  | `MAX_PROFESIONALES_POR_SUCURSAL`  |
| Modelos Prisma       | PascalCase   | `Local`, `Sucursal`, `Cita`       |
| Campos de BD         | snake_case   | `fecha_hora_inicio`, `local_id`   |
| Slugs / URLs         | kebab-case   | `/studio-nova-providencia`        |

### Server Components vs Client Components

- **Por defecto: Server Component.** No agregar `"use client"` salvo que sea estrictamente necesario
  (interactividad, hooks de estado/efecto, eventos del DOM).
- **Server Actions** para todas las mutaciones (cambiar estado de cita, crear profesional, etc.).
- Nunca exponer lógica de negocio sensible en Client Components.

### Manejo de Errores (obligatorio según Mega-Prompt)

```typescript
// Server Action — patrón obligatorio
"use server";
export async function marcarCitaPagada(citaId: string) {
  try {
    await prisma.cita.update({
      where: { id: citaId },
      data: { estado: "pagada" },
    });
    return { success: true };
  } catch (error) {
    console.error("[marcarCitaPagada]", error);
    return { success: false, error: "No se pudo actualizar la cita." };
  }
}

// API Route — patrón obligatorio
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // lógica...
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[webhook/whatsapp]", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
```

### Tipado

- TypeScript estricto. **Prohibido usar `any`** salvo casos excepcionales con comentario justificado.
- Usar tipos generados por Prisma como fuente de verdad para modelos de BD.
- Usar **Zod** para validar inputs de formularios y payloads de API antes de tocar la BD.
- Preferir `satisfies` sobre aserciones de tipo (`as`) cuando sea posible.

### Formateo

- Prettier con configuración por defecto. 2 espacios de indentación. Punto y coma obligatorio.
- Comillas dobles para strings. Trailing comma: `"es5"`.

---

## 8. UI/UX — Estética "Tech & Clarity" (no negociable)

- **Fondos**: `bg-white` (#FFFFFF) y `bg-gray-50` (#F9FAFB). **Sin dark mode.**
- **Acentos y CTAs**: `bg-cyan-500` / `bg-cyan-600` (#06B6D4, #0ea5e9, #0284C7).
  Todo botón principal ("Reservar", "Ver Planes", "Confirmar") debe usar este color.
- **Texto**: gris oscuro/negro para máxima legibilidad.
- **Tipografía**: Inter o Montserrat (Sans-Serif). Configurar en `tailwind.config.ts`.
- **Mobile-First**: diseñar siempre desde `sm:` hacia arriba. Nunca asumir escritorio primero.

---

## 9. Reglas de Negocio Críticas

1. **Límite de profesionales**: máximo 10 por sucursal. Validar en Server Action antes de insertar
   con `prisma.profesional.count({ where: { sucursal_id } })`. Rechazar con error si se supera.
2. **Precios**: Plan 1 Sucursal = **$15.990 CLP/mes**. Plan Multi-Sucursal = **$27.990 CLP/mes**.
3. **Disponibilidad**: Google Calendar es la fuente de verdad. Consultar en tiempo real al mostrar
   horarios disponibles en el flujo B2C.
4. **Slug**: generado automáticamente desde el nombre de la sucursal (slugify). Debe ser único en BD.
5. **Recordatorios**: el cron (`cron.ts`) corre cada hora. Filtra citas con
   `estado == activa AND recordatorio_enviado == false AND fecha_hora_inicio BETWEEN NOW() AND NOW()+25h`.
6. **Mensaje de cancelación por barbero** (texto exacto según PRD):
   > "Hola. Por motivos de fuerza mayor, su hora ha sido cancelada y deberá reagendar.
   > Lamentamos las molestias. Por favor, reserve su nueva hora aquí:
   > https://nexreserva.cl/[slug_de_la_sucursal]"
7. **Cancelación por cliente**: si el mensaje de WhatsApp es `"Cancelar"`, anular cita,
   liberar Google Calendar y notificar al profesional:
   > "🚨 Hola [Nombre], se acaba de liberar tu bloque de las [HH:MM]. Un cliente canceló."
8. **Agente IA de reservas**: ante solicitudes de cita por WhatsApp, el bot DEBE preguntar
   explícitamente por (a) nombre del local y (b) sucursal antes de enviar el link.

---

## 10. Variables de Entorno Requeridas (.env.example)

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/nexreserva"

# Google Calendar API
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""

# Evolution API v2
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY=""

# IA (usar uno o ambos según modelo elegido)
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""

# App
NEXT_PUBLIC_BASE_URL="https://nexreserva.cl"
```

---

## 11. Docker — Infraestructura Local y VPS

El `docker-compose.yml` debe incluir **PostgreSQL** y **Evolution API v2**.
Agregar comentarios explicando cómo usar **ngrok** para exponer el webhook durante desarrollo:

```yaml
# Para exponer el webhook de Evolution API localmente:
# 1. Instalar ngrok: https://ngrok.com
# 2. Correr: ngrok http 3000
# 3. Copiar la URL pública (ej: https://abc123.ngrok.io)
# 4. Configurar en Evolution API: webhook_url = https://abc123.ngrok.io/api/webhooks/whatsapp
```
