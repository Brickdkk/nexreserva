import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      subscriptionPlan: string | null;
      subscriptionUntil: Date | null;
    } & DefaultSession["user"];
  }
}
