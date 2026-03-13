-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('activa', 'pagada', 'cancelada_cliente', 'cancelada_barbero');

-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "evolution_token" TEXT NOT NULL,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "local_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "limite_profesionales" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profesional" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "foto_url" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "google_calendar_id" TEXT NOT NULL,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "duracion_minutos" INTEGER NOT NULL,
    "precio" INTEGER NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "profesional_id" TEXT NOT NULL,
    "servicio_id" TEXT NOT NULL,
    "cliente_telefono" TEXT NOT NULL,
    "fecha_hora_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_hora_fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'activa',
    "recordatorio_enviado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sucursal_slug_key" ON "Sucursal"("slug");

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
