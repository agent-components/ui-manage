/** A link is attacker-supplied text; a toast is not a place for 4 KB of it. */
export function clamp(value: string): string {
  return value.length > 120 ? `${value.slice(0, 119)}…` : value
}

/**
 * Runs a link's layer search. Searching can load other pages after the file opened, so a
 * failure is reported as an error rather than as a layer the document does not carry.
 */
export async function searchLinkedNode(
  selectByName: (name: string) => boolean | Promise<boolean>,
  name: string
): Promise<{ found: boolean } | { error: string }> {
  try {
    return { found: await selectByName(name) }
  } catch (error) {
    return { error: clamp(error instanceof Error ? error.message : String(error)) }
  }
}
