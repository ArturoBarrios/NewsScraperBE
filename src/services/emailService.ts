import { Resend } from 'resend';

export const sendTestEmail = async (to: string) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: 'PeacePad <onboarding@resend.dev>',
    to: [to],
    subject: 'Welcome to PeacePad',
    html: `<p>Congrats on finding your quiet place 🧘‍♂️</p>`,
  });

  if (error) {
    console.error("[Email Error]", error);
    return { success: false, error };
  }

  console.log("[Email Sent]", data);
  return { success: true, data };
};
