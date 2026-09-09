import { Router } from "express";
import bcrypt from "bcryptjs";
import { AppRole, Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { asyncRoute } from "../lib/http";
import { signToken } from "../middleware/auth";
import { loginSchema, registerSchema } from "../utils/validation";
import { config } from "../config";

const router = Router();

router.post(
  "/register",
  asyncRoute(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const organization = await prisma.organization.findUnique({
      where: { id: config.defaultOrganizationId },
      select: { id: true },
    });
    if (!organization) {
      return res.status(500).json({ error: "Configured organization does not exist; run the seed" });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { password, firstName, lastName, phone } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await prisma.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim() || null,
          certSpecialties: [],
          roles: { create: [{ role: AppRole.CLIENT }] },
        },
        include: { roles: { select: { role: true } } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      throw error;
    }

    const roles = user.roles.map((record) => record.role);
    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      roles,
    });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        roles,
      },
    });
  }),
);

router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        organizationId: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        roles: { select: { role: true } },
      },
    });

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const roles = user.roles.map((record) => record.role);
    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId,
      roles,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`.trim(),
        roles,
      },
    });
  }),
);

export default router;
