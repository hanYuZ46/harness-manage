import type { Metadata } from "next";
import { getPageTitle } from "@/utils/page-title";
import { AboutPageClient } from "@/features/landing/components/about-page-client";

export const metadata: Metadata = {
  title: getPageTitle("About"),
  description:
    "Learn about Harness Manager — Multi-Agent collaboration platform. An open-source project management platform for AI agent teams.",
  openGraph: {
    title: "About Harness Manager",
    description:
      "The story behind Harness Manager and why we're building project management for multi-Agent teams.",
    url: "/about",
  },
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
