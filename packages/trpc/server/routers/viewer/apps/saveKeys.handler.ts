import type { AppCategories } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TSaveKeysInputSchema } from "./saveKeys.schema";

type SaveKeysOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSaveKeysInputSchema;
};

export const saveKeysHandler = async ({ ctx: _ctx, input }: SaveKeysOptions) => {
  const appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
  const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas];
  const keys = keysSchema.parse(input.keys);

  // Get app name from metadata
  const localApps = getLocalAppMetadata();
  const appMetadata = localApps.find((localApp) => localApp.slug === input.slug);

  if (!appMetadata?.dirName && appMetadata?.categories)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "App metadata could not be found" });

  await prisma.app.upsert({
    where: {
      slug: input.slug,
    },
    update: { keys },
    create: {
      slug: input.slug,
      dirName: appMetadata?.dirName || "",
      categories:
        (appMetadata?.categories as AppCategories[]) ||
        ([appMetadata?.category] as AppCategories[]) ||
        undefined,
      keys: (input.keys as Prisma.InputJsonObject) || undefined,
    },
  });
};