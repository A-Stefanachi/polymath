// UI strings (doc 09 section 11: plain, calm, no pressure). One source so the copy lint sees them all.

export const welcome = {
  title: "Polymath",
  description: "Adaptive practice with spaced retrieval, graded feedback and guided builds.",
  emailLabel: "Email address",
  sendCode: "Email me a code",
  sending: "Sending",
  sent: "Check your email and enter the 6-digit code here. The email also has a sign-in link, which may open in your browser instead of this app.",
  codeLabel: "6-digit code",
  signIn: "Sign in",
  verifying: "Checking the code",
  resend: "Send a new code",
  invalidEmail: "Enter an email address like name@example.com.",
  codeInvalid: "That code did not work. It may be wrong, already used or expired. You can ask for a new one.",
  linkInvalid: "That sign-in link did not work. It may be already used or expired. Enter your email to get a new code.",
  rateLimited: "Too many requests just now. Wait a minute and try again.",
  unavailable: "We could not send the email. Nothing was lost; try again in a moment.",
  privacy: "Privacy summary, data export and deletion",
} as const;
