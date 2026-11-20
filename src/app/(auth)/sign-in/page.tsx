import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Sign in · Bigfoot",
};

export default function SignInPage() {
  return <AuthCard />;
}
