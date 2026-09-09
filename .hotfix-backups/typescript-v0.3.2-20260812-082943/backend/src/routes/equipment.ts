import { Router } from "express";
import { z } from "zod";
import { AppRole, EquipmentCategory, Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const adminRoles = [AppRole.ADMIN, AppRole.OWNER];

function isCatalogueAdmin(roles: AppRole[]): boolean {
  return roles.some((role) => adminRoles.includes(role));
}

router.get(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const includeInactive =
      req.query.includeInactive === "true" && isCatalogueAdmin(req.auth!.roles);

    const equipmentItems = await prisma.equipmentItem.findMany({
      where: {
        organizationId: req.auth!.organizationId,
        ...(includeInactive ? {} : { active: true }),
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        active: true,
        displayOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ equipmentItems });
  }),
);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const createItemSchema = z
  .object({
    slug: z.string().trim().min(1).max(80).optional(),
    name: z.string().trim().min(1).max(120),
    category: z.nativeEnum(EquipmentCategory),
    active: z.boolean().default(true),
    displayOrder: z.number().int().min(0).max(10_000).default(0),
  })
  .strict();

router.post(
  "/",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const slug = slugify(parsed.data.slug ?? parsed.data.name);
    if (!slug) {
      return res.status(400).json({ error: "Unable to create a valid slug" });
    }

    try {
      const equipmentItem = await prisma.equipmentItem.create({
        data: {
          organizationId: req.auth!.organizationId,
          ...parsed.data,
          slug,
        },
      });
      return res.status(201).json({ equipmentItem });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({ error: "That equipment slug already exists" });
      }
      throw error;
    }
  }),
);

const updateItemSchema = createItemSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

router.patch(
  "/:id",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const existing = await prisma.equipmentItem.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Equipment item not found" });
    }

    const normalizedSlug =
      parsed.data.slug === undefined ? undefined : slugify(parsed.data.slug);
    if (parsed.data.slug !== undefined && !normalizedSlug) {
      return res.status(400).json({ error: "Unable to create a valid slug" });
    }

    const data = {
      ...parsed.data,
      ...(normalizedSlug !== undefined && { slug: normalizedSlug }),
    };

    try {
      const equipmentItem = await prisma.equipmentItem.update({
        where: { id: existing.id },
        data,
      });
      return res.json({ equipmentItem });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({ error: "That equipment slug already exists" });
      }
      throw error;
    }
  }),
);

// Retire catalogue items instead of deleting them. Historical booking request
// rows remain readable and the item disappears from normal client selection.
router.delete(
  "/:id",
  requireAuth,
  requireRole(...adminRoles),
  asyncRoute(async (req, res) => {
    const existing = await prisma.equipmentItem.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.auth!.organizationId,
      },
      select: { id: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "Equipment item not found" });
    }

    await prisma.equipmentItem.update({
      where: { id: existing.id },
      data: { active: false },
    });

    return res.status(204).send();
  }),
);

export default router;
