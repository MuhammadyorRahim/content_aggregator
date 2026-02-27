export function passwordResetEmailTemplate(params: { name?: string | null; resetUrl: string }) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Reset your password</h2>
      <p>${greeting}</p>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p>
        <a href="${params.resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>${params.resetUrl}</p>
    </div>
  `;
}
