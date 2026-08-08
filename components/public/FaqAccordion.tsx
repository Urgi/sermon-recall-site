'use client';

import { useId, useState } from 'react';

type FaqItem = {
  question: string;
  answer: string;
};

type Props = {
  items: readonly FaqItem[];
  /** Open the first item by default on the homepage for discoverability. */
  defaultOpenFirst?: boolean;
};

export function FaqAccordion({ items, defaultOpenFirst = false }: Props) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenFirst ? 0 : null);

  return (
    <div className="divide-y divide-[rgba(56,189,248,0.12)] rounded-xl border border-[rgba(56,189,248,0.15)] bg-[#0a0f18]">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div key={item.question} className="px-1 first:pt-1 last:pb-1">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-start justify-between gap-4 rounded-lg px-5 py-4 text-left transition-colors hover:bg-[#05070a]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]"
              >
                <span className="text-[15px] font-semibold leading-snug text-white sm:text-[16px]">
                  {item.question}
                </span>
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(56,189,248,0.25)] text-[#38bdf8] transition-transform duration-200 ${
                    isOpen ? 'rotate-45 bg-[#0ea5e9]/10' : 'bg-[#05070a]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 2v8M2 6h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-[15px] leading-relaxed text-[#94a3b8]">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
