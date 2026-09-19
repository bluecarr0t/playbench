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
          <div className="relative w-[min(92vw,22rem)] pb-3 md:w-[min(78vw,32rem)] xl:w-[min(52vw,38rem)]">
            <h1>
              <span className="sr-only">Playbench</span>
              <img
                src="/playbench-wordmark.svg"
                alt=""
                width={996}
                height={220}
                draggable={false}
                className="h-auto w-full object-contain object-left"
              />
            </h1>
            <p className="absolute top-[74%] left-[13.5%] pt-1 font-serif text-[clamp(1.45rem,4vw,2.6rem)] leading-none italic">
              studio
            </p>
          </div>
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
