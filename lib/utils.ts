/**
 * Convierte un string en un slug URL-friendly en kebab-case.
 * Ej: "Studio Nova - Providencia" → "studio-nova-providencia"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // eliminar diacríticos (tildes, ñ → n, etc.)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // eliminar caracteres especiales
    .replace(/\s+/g, "-") // espacios → guiones
    .replace(/-+/g, "-"); // múltiples guiones → uno
}

/**
 * Formatea un número entero como precio en CLP.
 * Ej: 15990 → "$15.990"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea una fecha DateTime como string legible en español (Chile).
 * Ej: "lunes 12 de enero, 10:30"
 */
export function formatFechaHora(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
}

/**
 * Formatea solo la hora de una fecha.
 * Ej: "10:30"
 */
export function formatHora(date: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(date);
}

/**
 * Retorna la fecha de fin calculada desde una fecha de inicio y duración en minutos.
 */
export function calcularFechaFin(inicio: Date, duracionMinutos: number): Date {
  return new Date(inicio.getTime() + duracionMinutos * 60 * 1000);
}
