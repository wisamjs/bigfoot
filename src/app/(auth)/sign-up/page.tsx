import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";

export const metadata: Metadata = {
  title: "Sign up · Bigfoot",
};

export default function SignUpPage() {
  return <AuthCard />;
}
