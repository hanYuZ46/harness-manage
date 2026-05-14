// apps/web/page-title.ts
const brandFullName = "Harness Manager";

export function getPageTitle(title?: string): string {
  return title ? `${title} - ${brandFullName}` : brandFullName;
}
