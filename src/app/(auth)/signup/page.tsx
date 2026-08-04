import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Order from kitchens near you, or start selling your own food.
      </p>

      <SignupForm />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
