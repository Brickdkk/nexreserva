import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { MercadoPagoConfig, Preference } from "mercadopago";
import type { PlanSuscripcion } from "@prisma/client";

const PLANES: Record<string, { title: string; price: number; plan: PlanSuscripcion }> = {
  basico: {
    title: "NexReserva — Plan Básico (1 Sucursal, 6 profesionales)",
    price: 14990,
    plan: "basico",
  },
  avanzado: {
    title: "NexReserva — Plan Avanzado (1 Sucursal, 10 profesionales)",
    price: 22990,
    plan: "avanzado",
  },
  multi_basico: {
    title: "NexReserva — Plan Multi-Básico (Multi-Sucursal, 6 profesionales c/u)",
    price: 27990,
    plan: "multi_basico",
  },
  multi_avanzado: {
    title: "NexReserva — Plan Multi-Avanzado (Multi-Sucursal, 10 profesionales c/u)",
    price: 36990,
    plan: "multi_avanzado",
  },
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { plan } = await params;
  const planData = PLANES[plan];
  if (!planData) {
    return NextResponse.json({ error: "Plan no existe" }, { status: 404 });
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Mercado Pago no configurado aún. Agrega MP_ACCESS_TOKEN al .env" },
      { status: 503 }
    );
  }

  const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const preference = new Preference(mp);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const result = await preference.create({
    body: {
      items: [
        {
          id: planData.plan,
          title: planData.title,
          quantity: 1,
          unit_price: planData.price,
          currency_id: "CLP",
        },
      ],
      payer: {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      },
      back_urls: {
        success: `${baseUrl}/api/checkout/success`,
        failure: `${baseUrl}/onboarding?error=pago_fallido`,
        pending: `${baseUrl}/onboarding?pending=1`,
      },
      auto_return: "approved",
      external_reference: `${session.user.id}|${planData.plan}`,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  });

  // Redirigir al checkout de Mercado Pago
  return NextResponse.redirect(result.init_point!);
}
