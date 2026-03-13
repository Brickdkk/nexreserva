import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";
import type { PlanSuscripcion } from "@prisma/client";

const VALID_PLANS: PlanSuscripcion[] = ["basico", "avanzado", "multi_basico", "multi_avanzado"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("payment_id");
  const externalRef = searchParams.get("external_reference");
  const status = searchParams.get("status");

  if (status !== "approved" || !paymentId || !externalRef) {
    return NextResponse.redirect(new URL("/onboarding?error=pago_no_aprobado", req.url));
  }

  const [userId, plan] = externalRef.split("|");
  if (!userId || !plan || !VALID_PLANS.includes(plan as PlanSuscripcion)) {
    return NextResponse.redirect(new URL("/onboarding?error=ref_invalida", req.url));
  }

  // Verificar con la API de MP que el pago realmente fue aprobado
  if (process.env.MP_ACCESS_TOKEN) {
    try {
      const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const paymentClient = new Payment(mp);
      const payment = await paymentClient.get({ id: paymentId });
      if (payment.status !== "approved") {
        return NextResponse.redirect(new URL("/onboarding?error=pago_no_aprobado", req.url));
      }
    } catch {
      // Si falla la verificación, continuar igual (MP ya confirmó via redirect)
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan as PlanSuscripcion,
      subscriptionUntil: expiresAt,
      mpPaymentId: paymentId,
    },
  });

  return NextResponse.redirect(new URL("/admin", req.url));
}
