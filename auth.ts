import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      // Inyectar estado de suscripción en la sesión
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { subscriptionPlan: true, subscriptionUntil: true },
      });
      session.user.subscriptionPlan = dbUser?.subscriptionPlan ?? null;
      session.user.subscriptionUntil = dbUser?.subscriptionUntil ?? null;
      return session;
    },
  },
});
