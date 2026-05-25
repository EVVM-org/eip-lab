import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DemoShell from "@/components/demo/DemoShell";
import DemoHeader from "@/components/demo/DemoHeader";
import { getAllDemoSlugs, getDemoBySlug } from "@/lib/demos";
import { SITE } from "@/lib/constants";

interface PageProps {
  params: Promise<{ eip: string }>;
}

export async function generateStaticParams() {
  return getAllDemoSlugs().map((eip) => ({ eip }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eip } = await params;
  const demo = await getDemoBySlug(eip);
  if (!demo) return { title: `${SITE.name} — demo not found` };
  return {
    title: `EIP-${demo.eip.number} — ${demo.eip.title}`,
    description: demo.experiment.hypothesis,
  };
}

export default async function DemoPage({ params }: PageProps) {
  const { eip } = await params;
  const demo = await getDemoBySlug(eip);

  if (!demo) {
    notFound();
  }

  return (
    <>
      <DemoHeader demo={demo} />
      <DemoShell demo={demo} />
    </>
  );
}
