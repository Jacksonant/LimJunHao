import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface ScrollAnimationProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scale' | 'rotate';
  delay?: number;
  duration?: number;
}

const ScrollAnimations: React.FC<ScrollAnimationProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 1
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const animations = {
      fadeIn: { opacity: 0, y: 30 },
      slideUp: { opacity: 0, y: 100 },
      slideLeft: { opacity: 0, x: -100 },
      slideRight: { opacity: 0, x: 100 },
      scale: { opacity: 0, scale: 0.8 },
      rotate: { opacity: 0, rotation: 45, scale: 0.8 }
    };

    gsap.set(element, animations[animation]);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(element, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            duration,
            delay,
            ease: 'power2.out'
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [animation, delay, duration]);

  return (
    <div ref={elementRef}>
      {children}
    </div>
  );
};

export default ScrollAnimations;