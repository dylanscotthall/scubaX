import {
  BookingEquipmentRequest,
  CylinderForm,
  EquipmentCategory,
  EquipmentItem,
  FinStyle,
  GasType,
  Prisma,
  UserEquipmentProfile,
} from "../generated/prisma/client";
import { z } from "zod";
import { HttpError } from "./http";

const nullableTrimmedString = (max: number) =>
  z.string().trim().min(1).max(max).nullable().optional();

export const equipmentSelectionSchema = z
  .object({
    requestedSize: z.string().trim().min(1).max(20).optional(),
    gasType: z.nativeEnum(GasType).optional(),
    nitroxPercent: z.number().int().min(22).max(40).optional(),
    cylinderVolumeLitres: z.number().int().min(1).max(30).optional(),
    cylinderForm: z.nativeEnum(CylinderForm).optional(),
    requestedWeightKg: z.number().positive().max(40).multipleOf(0.5).optional(),
    shoeSizeUk: z.number().min(1).max(16).multipleOf(0.5).optional(),
    finStyle: z.nativeEnum(FinStyle).optional(),
    clientNote: nullableTrimmedString(500),
  })
  .strict();

export const equipmentRequestInputSchema = z
  .object({
    equipmentItemId: z.string().guid(),
    quantity: z.number().int().min(1).max(4).default(1),
    selection: equipmentSelectionSchema.default({}),
  })
  .strict();

export const equipmentRequestListSchema = z
  .array(equipmentRequestInputSchema)
  .max(20, "A booking cannot contain more than 20 equipment request rows")
  .default([]);

export const equipmentProfileInputSchema = z
  .object({
    bcdSize: z.string().trim().min(1).max(20).nullable().default(null),
    wetsuitSize: z.string().trim().min(1).max(20).nullable().default(null),
    preferredGasType: z.nativeEnum(GasType).nullable().default(null),
    preferredNitroxPercent: z
      .number()
      .int()
      .min(22)
      .max(40)
      .nullable()
      .default(null),
    preferredCylinderVolumeLitres: z
      .number()
      .int()
      .min(1)
      .max(30)
      .nullable()
      .default(null),
    preferredCylinderForm: z.nativeEnum(CylinderForm).nullable().default(null),
    preferredWeightKg: z
      .number()
      .positive()
      .max(40)
      .multipleOf(0.5)
      .nullable()
      .default(null),
    shoeSizeUk: z
      .number()
      .min(1)
      .max(16)
      .multipleOf(0.5)
      .nullable()
      .default(null),
    finStyle: z.nativeEnum(FinStyle).nullable().default(null),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.preferredGasType === GasType.NITROX &&
      value.preferredNitroxPercent == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredNitroxPercent"],
        message: "A Nitrox preference requires a Nitrox percentage",
      });
    }

    if (
      value.preferredGasType !== GasType.NITROX &&
      value.preferredNitroxPercent != null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredNitroxPercent"],
        message:
          "Nitrox percentage may only be set when preferredGasType is NITROX",
      });
    }

    const cylinderPreferenceFields = [
      value.preferredGasType,
      value.preferredNitroxPercent,
      value.preferredCylinderVolumeLitres,
      value.preferredCylinderForm,
    ];
    const hasAnyCylinderPreference = cylinderPreferenceFields.some(
      (field) => field != null,
    );
    const hasRequiredCylinderPreference =
      value.preferredGasType != null &&
      value.preferredCylinderVolumeLitres != null &&
      value.preferredCylinderForm != null;

    if (hasAnyCylinderPreference && !hasRequiredCylinderPreference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["preferredGasType"],
        message:
          "Cylinder preferences require gas type, cylinder volume and cylinder form together",
      });
    }
  });

export type EquipmentRequestInput = z.infer<typeof equipmentRequestInputSchema>;
export type EquipmentProfileInput = z.infer<typeof equipmentProfileInputSchema>;

type CatalogItem = Pick<EquipmentItem, "id" | "name" | "category">;

const structuredSelectionKeys = [
  "requestedSize",
  "gasType",
  "nitroxPercent",
  "cylinderVolumeLitres",
  "cylinderForm",
  "requestedWeightKg",
  "shoeSizeUk",
  "finStyle",
] as const;

type StructuredSelectionKey = (typeof structuredSelectionKeys)[number];

function rejectUnexpectedFields(
  item: CatalogItem,
  selection: EquipmentRequestInput["selection"],
  allowed: StructuredSelectionKey[],
): void {
  const unexpected = structuredSelectionKeys.filter(
    (key) => selection[key] != null && !allowed.includes(key),
  );

  if (unexpected.length > 0) {
    throw new HttpError(
      400,
      `${item.name} does not accept these fields: ${unexpected.join(", ")}`,
    );
  }
}

function normalizedClientNote(note: string | null | undefined): string | null {
  if (note == null) return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requestDataForItem(
  item: CatalogItem,
  input: EquipmentRequestInput,
): Omit<Prisma.BookingEquipmentRequestCreateManyInput, "bookingId"> {
  const selection = input.selection;
  const common = {
    equipmentItemId: item.id,
    quantity: input.quantity,
    clientNote: normalizedClientNote(selection.clientNote),
  };

  switch (item.category) {
    case EquipmentCategory.BCD:
    case EquipmentCategory.WETSUIT: {
      rejectUnexpectedFields(item, selection, ["requestedSize"]);
      if (!selection.requestedSize) {
        throw new HttpError(400, `${item.name} requires a requestedSize`);
      }
      return {
        ...common,
        requestedSize: selection.requestedSize.trim().toUpperCase(),
      };
    }

    case EquipmentCategory.CYLINDER: {
      rejectUnexpectedFields(item, selection, [
        "gasType",
        "nitroxPercent",
        "cylinderVolumeLitres",
        "cylinderForm",
      ]);

      if (!selection.gasType) {
        throw new HttpError(400, `${item.name} requires a gasType`);
      }
      if (selection.cylinderVolumeLitres == null) {
        throw new HttpError(400, `${item.name} requires cylinderVolumeLitres`);
      }
      if (!selection.cylinderForm) {
        throw new HttpError(400, `${item.name} requires cylinderForm`);
      }
      if (
        selection.gasType === GasType.NITROX &&
        selection.nitroxPercent == null
      ) {
        throw new HttpError(
          400,
          `${item.name} requires nitroxPercent for Nitrox`,
        );
      }
      if (
        selection.gasType === GasType.AIR &&
        selection.nitroxPercent != null
      ) {
        throw new HttpError(
          400,
          `${item.name} cannot include nitroxPercent when gasType is AIR`,
        );
      }

      return {
        ...common,
        gasType: selection.gasType,
        nitroxPercent:
          selection.gasType === GasType.NITROX ? selection.nitroxPercent : null,
        cylinderVolumeLitres: selection.cylinderVolumeLitres,
        cylinderForm: selection.cylinderForm,
      };
    }

    case EquipmentCategory.WEIGHTS: {
      rejectUnexpectedFields(item, selection, ["requestedWeightKg"]);
      if (input.quantity !== 1) {
        throw new HttpError(
          400,
          `${item.name} quantity must be 1 because requestedWeightKg is the total lead required`,
        );
      }
      if (selection.requestedWeightKg == null) {
        throw new HttpError(400, `${item.name} requires requestedWeightKg`);
      }
      return {
        ...common,
        requestedWeightKg: selection.requestedWeightKg,
      };
    }

    case EquipmentCategory.FINS: {
      rejectUnexpectedFields(item, selection, ["shoeSizeUk", "finStyle"]);
      if (selection.shoeSizeUk == null) {
        throw new HttpError(400, `${item.name} requires shoeSizeUk`);
      }
      if (!selection.finStyle) {
        throw new HttpError(400, `${item.name} requires finStyle`);
      }
      return {
        ...common,
        shoeSizeUk: selection.shoeSizeUk,
        finStyle: selection.finStyle,
      };
    }

    case EquipmentCategory.REGULATOR:
    case EquipmentCategory.MASK:
    case EquipmentCategory.DIVE_COMPUTER:
      rejectUnexpectedFields(item, selection, []);
      return common;

    default: {
      const neverCategory: never = item.category;
      throw new HttpError(
        400,
        `Unsupported equipment category: ${neverCategory}`,
      );
    }
  }
}

export async function prepareEquipmentRequestRows(
  tx: Prisma.TransactionClient,
  organizationId: string,
  bookingId: string,
  inputs: EquipmentRequestInput[],
): Promise<Prisma.BookingEquipmentRequestCreateManyInput[]> {
  const ids = inputs.map((input) => input.equipmentItemId);
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(
      400,
      "Each equipment item may only appear once per booking",
    );
  }

  if (inputs.length === 0) return [];

  const items = await tx.equipmentItem.findMany({
    where: {
      id: { in: ids },
      organizationId,
      active: true,
    },
    select: { id: true, name: true, category: true },
  });

  if (items.length !== ids.length) {
    throw new HttpError(
      400,
      "One or more equipment items do not exist, are inactive, or belong to another organization",
    );
  }

  const itemById = new Map(items.map((item) => [item.id, item]));

  return inputs.map((input) => {
    const item = itemById.get(input.equipmentItemId);
    if (!item) {
      throw new HttpError(400, "Equipment catalogue validation failed");
    }

    return {
      bookingId,
      ...requestDataForItem(item, input),
    };
  });
}

export function serializeEquipmentProfile(
  profile: UserEquipmentProfile | null,
) {
  if (!profile) {
    return {
      bcdSize: null,
      wetsuitSize: null,
      preferredGasType: null,
      preferredNitroxPercent: null,
      preferredCylinderVolumeLitres: null,
      preferredCylinderForm: null,
      preferredWeightKg: null,
      shoeSizeUk: null,
      finStyle: null,
    };
  }

  return {
    bcdSize: profile.bcdSize,
    wetsuitSize: profile.wetsuitSize,
    preferredGasType: profile.preferredGasType,
    preferredNitroxPercent: profile.preferredNitroxPercent,
    preferredCylinderVolumeLitres: profile.preferredCylinderVolumeLitres,
    preferredCylinderForm: profile.preferredCylinderForm,
    preferredWeightKg:
      profile.preferredWeightKg == null
        ? null
        : Number(profile.preferredWeightKg),
    shoeSizeUk: profile.shoeSizeUk == null ? null : Number(profile.shoeSizeUk),
    finStyle: profile.finStyle,
  };
}

type RequestWithItem = BookingEquipmentRequest & {
  equipmentItem: Pick<EquipmentItem, "id" | "slug" | "name" | "category">;
};

export function serializeEquipmentRequest(request: RequestWithItem) {
  return {
    id: request.id,
    bookingId: request.bookingId,
    quantity: request.quantity,
    equipmentItem: request.equipmentItem,
    requestedSize: request.requestedSize,
    gasType: request.gasType,
    nitroxPercent: request.nitroxPercent,
    cylinderVolumeLitres: request.cylinderVolumeLitres,
    cylinderForm: request.cylinderForm,
    requestedWeightKg:
      request.requestedWeightKg == null
        ? null
        : Number(request.requestedWeightKg),
    shoeSizeUk: request.shoeSizeUk == null ? null : Number(request.shoeSizeUk),
    finStyle: request.finStyle,
    clientNote: request.clientNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
