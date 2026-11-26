/**
 * What Delete account says it removes: "your 1 Application", "all 4 of your Applications", or "all of
 * your Applications" while the count loads.
 */
export function deletedApplicationsText(count: number | undefined): string {
  if (count === undefined) return "all of your Applications";
  return count === 1 ? "your 1 Application" : `all ${count} of your Applications`;
}
