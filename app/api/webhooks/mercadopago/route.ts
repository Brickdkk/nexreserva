import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";
import type { PlanSuscripcion } from "@prisma/client";

const VALID_PLANS: PlanSuscripcion[] = ["basico", "avanzado", "multi_basico", "multi_avanzado"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  // Solo procesar notificaciones de pago
  if (body.type !== "payment" || !body.data?.id) {
    return NextResponse.json({ ok: true });
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return NextResponse.json({ ok: true });
  }

  try {
    const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: body.data.id });

    if (payment.status !== "approved" || !payment.external_reference) {
      return NextResponse.json({ ok: true });
    }

    const [userId, plan] = payment.external_reference.split("|");
    if (!userId || !plan || !VALID_PLANS.includes(plan as PlanSuscripcion)) {
      return NextResponse.json({ ok: true });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan as PlanSuscripcion,
        subscriptionUntil: expiresAt,
        mpPaymentId: String(payment.id),
      },
    });
  } catch (err) {
    console.error("[MP Webhook]", err);
  }

  return NextResponse.json({ ok: true });
}
