/**
 * ui-manage: donation disabled — always define null donation URL.
 */
export function donationDefine(_root: string): Record<string, string> {
  return { __OPENPENCIL_DONATION_URL__: JSON.stringify(null) }
}
