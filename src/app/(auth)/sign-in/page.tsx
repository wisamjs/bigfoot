import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/authCard";

export const metadata: Metadata = {
  title: "Sign in · Bigfoot",
};

export default function SignInPage() {
  return <AuthCard />;
}
