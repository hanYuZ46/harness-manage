// apps/utils/page-title.ts
import { brand } from "@/config/brand";

export function getPageTitle(title?: string): string {
  return title ? `${title} - ${brand.fullName}` : brand.fullName;
}
