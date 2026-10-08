import { cookies } from 'next/headers';
import { PasswordRecoveryForm } from './PasswordRecoveryForm';

export default async function ResetPasswordPage() {
  const recoveryVerified = (await cookies()).get('scipal-password-recovery')?.value === 'verified';
  return <PasswordRecoveryForm recoveryVerified={recoveryVerified} />;
}
