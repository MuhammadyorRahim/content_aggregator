export function welcomeEmailTemplate(params: { name?: string | null }) {
  const greeting = params.name ? `Hi ${params.name},` : "Hi,";

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2>Welcome to Content Aggregator</h2>
      <p>${greeting}</p>
      <p>Your account is verified and ready to use.</p>
      <p>You can now sign in and start subscribing to sources.</p>
    </div>
  `;
}
