import { NextResponse, type NextRequest } from "next/server";

import { getServerAuthSession } from "@/lib/auth";
import { adminOfferPatchSchema } from "@/lib/validation";
import { offerRepository } from "@/repositories/offer.repository";
import { toOfferDTO } from "@/services/offer.service";

export const dynamic = "force-dynamic";

/** Admin moderation: enable/disable/hide/feature a single offer. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = adminOfferPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const updated = await offerRepository.update(params.id, parsed.data);
    return NextResponse.json(toOfferDTO(updated));
  } catch {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }
}
