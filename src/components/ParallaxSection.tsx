'use client';

import React, { useEffect, useRef } from "react";

interface ParallaxSectionProps {
  children: React.ReactNode;
  speed?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}

const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  speed = 0.5,
  direction = "up",
  className,
  style,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!elementRef.current) return;

      const scrolled = window.pageYOffset;
      const rate = scrolled * -speed;

      let transform = "";
      switch (direction) {
        case "up":
          transform = `translateY(${rate}px)`;
          break;
        case "down":
          transform = `translateY(${-rate}px)`;
          break;
        case "left":
          transform = `translateX(${rate}px)`;
          break;
        case "right":
          transform = `translateX(${-rate}px)`;
          break;
      }

      if (elementRef.current) {
        elementRef.current.style.transform = transform;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed, direction]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default ParallaxSection;
