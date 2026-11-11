import { VECTORIZE_CREDENTIAL_REFS } from "@/app/editor/vectorize/credentials";
import { isUiManageEmbed } from "@/app/integrations/ui-manage/mode";
import {
  PEXELS_CREDENTIAL,
  UNSPLASH_CREDENTIAL,
} from "@/app/settings/credentials/migration";
import { credentialKey } from "@/app/settings/credentials/reference";

import { setBrowserCredentialPersistence } from "./app";
import type { CredentialRef } from "./types";

function uniqueCredentialRefs(references: CredentialRef[]): CredentialRef[] {
  return [
    ...new Map(
      references.map((reference) => [credentialKey(reference), reference])
    ).values(),
  ];
}

export function appCredentialRefs(): CredentialRef[] {
  // ui-manage: no AI / MCP / client storage credential vault.
  if (isUiManageEmbed) return [];

  return uniqueCredentialRefs([
    PEXELS_CREDENTIAL,
    UNSPLASH_CREDENTIAL,
    ...VECTORIZE_CREDENTIAL_REFS,
  ]);
}

export function setAppCredentialPersistence(
  remembered: boolean
): Promise<void> {
  return setBrowserCredentialPersistence(remembered, appCredentialRefs());
}
