import stripe from "../services/stripe";
import prisma from "../db/prismaClient";
import { Request, Response } from "express";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const stripeResolvers = {  
  Mutation: {
    createCheckoutSession: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error("Not authenticated");

      console.log("context.user: ", context.user);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: context.user.email, // Assuming email is email
        line_items: [
          {
            price: "price_1R2HiWDUXwYENeT47n7ZrjEj",
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL}/dashboard`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });

      return { sessionId: session.id, url: session.url };
    },
  },
};

// ✅ Webhook Handling Logic// ✅ Webhook Handling Logic (Kept Inside stripeResolvers.ts)
export const handleStripeWebhook = async (req: Request, res: Response) => {
  console.log("🔹 Webhook received...");

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("⚠️ Missing Stripe Signature");
    return res.status(400).send("Missing Stripe Signature");
  }

  let event;
  try {
    console.log("🔍 constructEvent...");
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Webhook Event Received:", event.type);

  switch (event.type) {
    case "checkout.session.completed": {
      console.log("🎉 Payment Success Event Triggered!");

      const session = event.data.object;
      console.log("🔍 Session Object:", session);
      const userEmail = session.customer_email; 

      if (!userEmail) {
        console.error("⚠️ User email missing from session.");
        return res.status(400).send("User email missing.");
      }

      console.log(`🔍 Looking up user: ${userEmail}`);
      const user = await prisma.user.findUnique({ where: { email: userEmail } });

      if (user) {
        // prisma logic
        


        
      } else {
        console.error("❌ No user found with this email.");
      }
      break;
    }
    default:
      console.log(`⚠️ Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
