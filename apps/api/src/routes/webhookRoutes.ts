import { verifyWebhook } from "@clerk/express/webhooks";
import { prisma } from "@disease-prediction/db";
import { Role } from "@disease-prediction/shared";
import { Router, raw } from "express";

const router = Router();

type ClerkEmailAddress = { id: string; email_address: string };

type ClerkUserData = {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string | null;
  public_metadata?: unknown;
  unsafe_metadata?: unknown;
};

/**
 * Read a `role` hint off Clerk's public/unsafe metadata and coerce it to our
 * `Role` enum. Returns `undefined` if no usable hint is present so Prisma can
 * fall back to the column default on create / leave the field untouched on update.
 */
function roleFromMetadata(metadata: unknown): Role | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = (metadata as { role?: unknown }).role;
  if (typeof raw !== "string") return undefined;
  const upper = raw.toUpperCase();
  if (upper === Role.PATIENT || upper === Role.DOCTOR) return upper as Role;
  return undefined;
}

function extractUserFields(data: ClerkUserData) {
  const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  return {
    id: data.id,
    email: primaryEmail?.email_address ?? "",
    name: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
    role: roleFromMetadata(data.public_metadata) ?? roleFromMetadata(data.unsafe_metadata),
  };
}

router.post("/webhooks/clerk", raw({ type: "application/json" }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req);

    if (evt.type === "user.created") {
      const { id, email, name, role } = extractUserFields(evt.data as ClerkUserData);
      await prisma.user.create({ data: { id, email, name, role } });
    }

    if (evt.type === "user.updated") {
      const { id, email, name, role } = extractUserFields(evt.data as ClerkUserData);
      await prisma.user.update({ where: { id }, data: { email, name, role } });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    res.status(400).json({ success: false, error: "Webhook verification failed" });
  }
});

export default router;
