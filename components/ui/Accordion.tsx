import React, { useState } from 'react';

interface AccordionSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface AccordionProps {
  sections: AccordionSection[];
  defaultOpenId?: string;
}

export default function Accordion({ sections, defaultOpenId }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId || null);

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="panel">
          <button
            type="button"
            className="w-full flex justify-between items-center px-6 py-4 text-lg font-semibold text-left text-text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            aria-expanded={openId === section.id}
            aria-controls={`accordion-content-${section.id}`}
            onClick={() => handleToggle(section.id)}
          >
            <span>{section.title}</span>
            <svg
              className={`w-5 h-5 ml-2 transition-transform duration-200 ${openId === section.id ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openId === section.id && (
            <div
              id={`accordion-content-${section.id}`}
              className="px-6 pb-6 pt-2 border-t border-surface-high"
            >
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
