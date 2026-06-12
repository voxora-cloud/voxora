import { SignupForm } from "../../components/signup-form";
import { AuthLayout } from "../../components/auth-layout";

export default function SetupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}

