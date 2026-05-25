import Hero from "@/components/landing/Hero";
import Why from "@/components/landing/Why";
import How from "@/components/landing/How";
import Compare from "@/components/landing/Compare";
import DemoPicker from "@/components/landing/DemoPicker";
import FAQ from "@/components/landing/FAQ";

export default function Home() {
  return (
    <>
      <Hero />
      <Why />
      <How />
      <Compare />
      <DemoPicker />
      <FAQ />
    </>
  );
}
