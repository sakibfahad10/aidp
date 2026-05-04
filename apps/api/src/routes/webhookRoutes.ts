import { verifyWebhook } from "@clerk/express/webhooks";
import { prisma } from "@disease-prediction/db";
import { Router, raw } from "express";

const router = Router();

type ClerkEmailAddress = { id: string; email_address: string };

router.post("/webhooks/clerk", raw({ type: "application/json" }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, primary_email_address_id } = evt.data;
      const primaryEmail = email_addresses.find(
        (e: ClerkEmailAddress) => e.id === primary_email_address_id,
      );
      const email = primaryEmail?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await prisma.user.create({
        data: { id, email, name },
      });
    }

    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, primary_email_address_id } = evt.data;
      const primaryEmail = email_addresses.find(
        (e: ClerkEmailAddress) => e.id === primary_email_address_id,
      );
      const email = primaryEmail?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;

      await prisma.user.update({
        where: { id },
        data: { email, name },
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    res.status(400).json({ success: false, error: "Webhook verification failed" });
  }
});

export default router;
