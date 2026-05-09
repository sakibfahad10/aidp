import { verifyWebhook } from "@clerk/express/webhooks";
import { prisma } from "@disease-prediction/db";
import { Role } from "@disease-prediction/shared";
import { Router, raw } from "express";

const router = Router();

type ClerkEmailAddress = { id: string; email_address: string };

/**
 * Read a `role` hint off Clerk's public/unsafe metadata and coerce it to our
 * `Role` enum. Returns `undefined` if no usable hint is present so callers can
 * fall back to the column default / leave it untouched on update.
 */
function roleFromMetadata(metadata: unknown): Role | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = (metadata as { role?: unknown }).role;
  if (typeof raw !== "string") return undefined;
  const upper = raw.toUpperCase();
  if (upper === Role.PATIENT || upper === Role.DOCTOR) return upper as Role;
  return undefined;
}

router.post("/webhooks/clerk", raw({ type: "application/json" }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;

    if (eventType === "user.created") {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        primary_email_address_id,
        public_metadata,
        unsafe_metadata,
      } = evt.data;
      const primaryEmail = email_addresses.find(
        (e: ClerkEmailAddress) => e.id === primary_email_address_id,
      );
      const email = primaryEmail?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;
      const role = roleFromMetadata(public_metadata) ?? roleFromMetadata(unsafe_metadata);

      await prisma.user.create({
        data: role ? { id, email, name, role } : { id, email, name },
      });
    }

    if (eventType === "user.updated") {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        primary_email_address_id,
        public_metadata,
        unsafe_metadata,
      } = evt.data;
      const primaryEmail = email_addresses.find(
        (e: ClerkEmailAddress) => e.id === primary_email_address_id,
      );
      const email = primaryEmail?.email_address ?? "";
      const name = [first_name, last_name].filter(Boolean).join(" ") || null;
      const role = roleFromMetadata(public_metadata) ?? roleFromMetadata(unsafe_metadata);

      await prisma.user.update({
        where: { id },
        data: role ? { email, name, role } : { email, name },
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    res.status(400).json({ success: false, error: "Webhook verification failed" });
  }
});

export default router;
