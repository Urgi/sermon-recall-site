import { redirect } from 'next/navigation';

/** Password reset is retired — pastors sign in with email OTP. */
export default function ResetPasswordPage() {
  redirect('/login');
}
