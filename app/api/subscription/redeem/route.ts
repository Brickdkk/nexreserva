import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PlanSuscripcion } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código requerido" }, { status: 400 });
  }

  const key = await prisma.subscriptionKey.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (!key) {
    return NextResponse.json({ error: "Código no válido." }, { status: 404 });
  }
  if (key.usedBy) {
    return NextResponse.json({ error: "Este código ya fue utilizado." }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + key.duration);

  await prisma.$transaction([
    prisma.subscriptionKey.update({
      where: { id: key.id },
      data: { usedBy: session.user.id, usedAt: new Date(), expiresAt },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionKey: key.code,
        subscriptionPlan: key.plan as PlanSuscripcion,
        subscriptionUntil: expiresAt,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, plan: key.plan, until: expiresAt });
}
