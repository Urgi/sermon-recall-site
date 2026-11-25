import { tr } from '@/lib/i18n/ui';

/** Shown when a signup confirmation link is opened instead of entering the OTP. */
export const codeNotLinkMessage = () => tr('msg.useCodeNotLink');

/** Shown when a legacy password-reset link is opened — sign-in is email OTP only. */
export const resetCodeNotLinkMessage = () => tr('msg.useResetCodeNotLink');

export const signupCodeSentMessage = () => tr('msg.signupCodeSent');

export const emailConfirmedMessage = () => tr('msg.emailConfirmed');
