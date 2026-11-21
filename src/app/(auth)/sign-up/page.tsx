import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign up · Bigfoot",
};

export default function SignUpPage() {
  return <AuthCard />;
}
