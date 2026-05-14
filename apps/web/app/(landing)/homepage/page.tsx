import type { Metadata } from "next";
import { getPageTitle } from "@/utils/page-title";
import { MulticaLanding } from "@/features/landing/components/multica-landing";

export const metadata: Metadata = {
  title: getPageTitle("Homepage"),
  description:
    "Harness Manager — multi-agent collaboration platform that turns AI agents into real teammates. Assign tasks, track progress, compound skills.",
  openGraph: {
    title: "Harness Manager — Multi-Agent Collaboration Platform",
    description:
      "Manage your AI agent workforce in one place.",
    url: "/homepage",
  },
  alternates: {
    canonical: "/homepage",
  },
};

export default function HomepagePage() {
  return <MulticaLanding />;
}
