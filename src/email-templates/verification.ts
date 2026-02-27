export function verificationEmailTemplate(params: { name?: string | null; verifyUrl: string }) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Verify your email</h2>
      <p>${greeting}</p>
      <p>Thanks for registering. Please verify your email to activate your account.</p>
      <p>
        <a href="${params.verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, copy this link:</p>
      <p>${params.verifyUrl}</p>
    </div>
  `;
}
