import Hero from "@/components/landing/Hero";
import Why from "@/components/landing/Why";
import How from "@/components/landing/How";
import Compare from "@/components/landing/Compare";
import DemoPicker from "@/components/landing/DemoPicker";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/chrome/Footer";
import ExperimentalBanner from "@/components/ui/ExperimentalBanner";

export default function Home() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <ExperimentalBanner />
      </div>
      <Hero />
      <Why />
      <How />
      <Compare />
      <DemoPicker />
      <FAQ />
      <Footer />
    </>
  );
}
