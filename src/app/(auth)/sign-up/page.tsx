import type { Metadata } from "next";
import { AuthCard } from "@/features/auth/authCard";

export const metadata: Metadata = {
  title: "Sign up · Bigfoot",
};

export default function SignUpPage() {
  return <AuthCard />;
}
