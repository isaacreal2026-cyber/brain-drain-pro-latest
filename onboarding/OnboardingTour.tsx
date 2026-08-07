import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Wifi, PlayCircle, ChevronRight, Check } from "lucide-react";

interface OnboardingTourProps {
  onFinish: () => void;
  onTrySample: () => void;
}

interface Slide {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    icon: <BrainCircuit className="w-10 h-10" />,
    title: "Build decision brains",
    body: "A brain is a short, yes/no guide that helps people make a decision — like a smart checklist. Create one in minutes, or try a sample below.",
    accent: "text-primary bg-primary/10",
  },
  {
    icon: <Wifi className="w-10 h-10" />,
    title: "Works fully offline",
    body: "Run brains anywhere, even with no signal. Your work is saved on this device. Sign in later to sync it across phones.",
    accent: "text-emerald-500 bg-emerald-500/10",
  },
  {
    icon: <PlayCircle className="w-10 h-10" />,
    title: "Share in one tap",
    body: "Send a brain to a friend with a link. No account needed to try one. You can also post, follow topics, and join communities when you're ready.",
    accent: "text-sky-500 bg-sky-500/10",
  },
];

export function OnboardingTour({ onFinish, onTrySample }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 ${slide.accent}`}>
          {slide.icon}
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-3">{slide.title}</h1>
        <p className="text-muted-foreground text-base leading-relaxed mb-10">
          {slide.body}
        </p>

        {/* Progress dots */}
        <div className="flex gap-2 mb-8" role="tablist" aria-label="Onboarding progress">
          {SLIDES.map((s, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="w-full space-y-3">
          <Button onClick={next} size="lg" className="w-full h-12 rounded-xl text-base gap-1">
            {isLast ? "Get started" : "Continue"}
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </Button>

          {isLast && (
            <Button onClick={onTrySample} variant="outline" size="lg" className="w-full h-12 rounded-xl text-base gap-2">
              <PlayCircle className="w-4 h-4" /> Try a sample brain
            </Button>
          )}

          {!isLast && (
            <button
              onClick={onFinish}
              className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
            >
              Skip intro
            </button>
          )}
        </div>

        {isLast && (
          <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1.5">
            <Check className="w-3 h-3 text-emerald-500" />
            No account required to explore
          </p>
        )}
      </div>
    </div>
  );
}
