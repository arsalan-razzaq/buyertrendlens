import { useEffect, useMemo, useState } from 'react';

const resolveStepElement = (selector) => {
  if (typeof document === 'undefined' || !selector) {
    return null;
  }

  return document.querySelector(selector);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const GuidedTour = ({ open, steps = [], onClose, onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);

  const safeSteps = useMemo(() => steps.filter((step) => step?.selector && step?.title), [steps]);
  const activeStep = safeSteps[activeIndex] || null;
  const isLastStep = activeIndex === safeSteps.length - 1;

  useEffect(() => {
    if (!open) {
      setActiveIndex(0);
      setHighlightRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !activeStep) {
      setHighlightRect(null);
      return undefined;
    }

    const element = resolveStepElement(activeStep.selector);

    if (!element) {
      setHighlightRect(null);
      return undefined;
    }

    element.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const updatePosition = () => {
      const element = resolveStepElement(activeStep.selector);

      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const padding = 10;
      setHighlightRect({
        top: Math.max(rect.top - padding, 12),
        left: Math.max(rect.left - padding, 12),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeStep, open]);

  if (!open || !activeStep || !safeSteps.length) {
    return null;
  }

  const viewportWidth = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight;
  const cardWidth = Math.min(360, viewportWidth - 32);
  const cardHeight = 230;

  const cardTop = highlightRect
    ? clamp(highlightRect.top + highlightRect.height + 16, 16, viewportHeight - cardHeight - 16)
    : 24;
  const cardLeft = highlightRect
    ? clamp(highlightRect.left, 16, viewportWidth - cardWidth - 16)
    : 16;

  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
      return;
    }

    setActiveIndex((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]" />

      {highlightRect ? (
        <>
          <div
            className="pointer-events-none absolute bg-slate-950/65"
            style={{
              top: 0,
              left: 0,
              width: '100%',
              height: `${highlightRect.top}px`
            }}
          />
          <div
            className="pointer-events-none absolute bg-slate-950/65"
            style={{
              top: `${highlightRect.top}px`,
              left: 0,
              width: `${highlightRect.left}px`,
              height: `${highlightRect.height}px`
            }}
          />
          <div
            className="pointer-events-none absolute bg-slate-950/65"
            style={{
              top: `${highlightRect.top}px`,
              left: `${highlightRect.left + highlightRect.width}px`,
              width: `calc(100% - ${highlightRect.left + highlightRect.width}px)`,
              height: `${highlightRect.height}px`
            }}
          />
          <div
            className="pointer-events-none absolute bg-slate-950/65"
            style={{
              top: `${highlightRect.top + highlightRect.height}px`,
              left: 0,
              width: '100%',
              height: `calc(100% - ${highlightRect.top + highlightRect.height}px)`
            }}
          />
          <div
            className="pointer-events-none absolute rounded-[28px] border-2 border-emerald-300 transition-all duration-200"
            style={{
              top: `${highlightRect.top}px`,
              left: `${highlightRect.left}px`,
              width: `${highlightRect.width}px`,
              height: `${highlightRect.height}px`
            }}
          />
        </>
      ) : null}

      <div
        className="absolute rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl"
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: `${cardWidth}px`
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Step {activeIndex + 1} / {safeSteps.length}
          </span>
          <button type="button" className="text-sm font-medium text-slate-500 transition hover:text-slate-800" onClick={onClose}>
            Skip tour
          </button>
        </div>

        <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-900">{activeStep.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{activeStep.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            className="button-secondary"
            onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
            disabled={activeIndex === 0}
          >
            Previous
          </button>
          <button type="button" className="button-primary" onClick={handleNext}>
            {isLastStep ? 'Finish tour' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
