'use client';

import { useEffect, useRef, useState } from 'react';

type ScrollRevealProps = {
  children: React.ReactNode;
  className?: string;
};

export default function ScrollReveal({ children, className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If already visible (e.g., fast navigation), don't re-animate
    if (visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={[
        'will-change-transform',
        'transition-all duration-500 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className || '',
      ].join(' ')}
    >
      {children}
    </div>
  );
}

