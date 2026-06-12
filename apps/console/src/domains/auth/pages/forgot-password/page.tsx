import { PasswordRecoveryForm } from "../../components/password-recovery-form";
import { AuthLayout } from "../../components/auth-layout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <PasswordRecoveryForm />
    </AuthLayout>
  );
}
