"use client";

import { useState } from "react";
import { EmailCapture } from "./email-capture";
import { HeroShapes } from "./hero-shapes";

export function JaydotenHero() {
  const [signupOpen, setSignupOpen] = useState(false);

  return (
    <div
      data-poster-home
      className="fixed inset-0 overflow-x-hidden overflow-y-auto bg-[#F4EBD8] text-[#D32F27]"
    >
      <div className="flex min-h-dvh w-full flex-col">
        <div className="relative z-20 shrink-0 px-4 pt-2 pb-2 md:pb-6 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:top-0 xl:z-10 xl:px-10 xl:pt-8 xl:pb-0">
          <h1 className="font-display text-[clamp(2.6rem,12vw,7.5rem)] leading-[0.82] tracking-[-0.02em]">
            Play Bench
          </h1>
          <p className="mt-1 font-display text-[clamp(1.65rem,8vw,5.5rem)] leading-[0.86] tracking-[-0.02em] lg:mt-4 lg:text-[clamp(2.1rem,7.5vw,4.75rem)] xl:text-[clamp(2.1rem,7vw,4.35rem)]">
            STUDIO WORKS
          </p>
          <p className="mt-4 max-w-xl font-sans text-[0.8125rem] leading-snug tracking-[-0.02em] text-[#D32F27]/85 lg:mt-10 lg:text-lg lg:leading-relaxed lg:tracking-normal">
            A Los Angeles experimental studio for kinetic sculptures and other
            creations made slowly, on purpose.
          </p>
          <div className="mt-2 flex max-w-xl flex-wrap items-center gap-x-2.5 gap-y-2 xl:mt-3 xl:block">
            <p className="font-sans text-sm leading-relaxed text-[#D32F27]/85 lg:text-lg">
              More coming soon.
            </p>
            <EmailCapture onOpenChange={setSignupOpen} />
          </div>
        </div>
        <div
          className={
            signupOpen
              ? "relative min-h-[72dvh] shrink-0 overflow-hidden pt-1 md:pt-3 xl:absolute xl:inset-0 xl:min-h-0 xl:flex-1 xl:overflow-hidden xl:pt-0"
              : "relative min-h-[24rem] flex-1 overflow-hidden pt-1 md:pt-3 xl:absolute xl:inset-0 xl:overflow-hidden xl:pt-0"
          }
        >
          <HeroShapes />
        </div>
      </div>
    </div>
  );
}
