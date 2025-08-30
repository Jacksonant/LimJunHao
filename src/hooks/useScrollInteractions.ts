import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export interface ScrollSection {
  id: string;
  element: HTMLElement | null;
  progress: number;
  isVisible: boolean;
  direction: 'up' | 'down';
}

export const useScrollInteractions = () => {
  const [sections, setSections] = useState<ScrollSection[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());

  const registerSection = (id: string, element: HTMLElement) => {
    sectionsRef.current.set(id, element);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollY / documentHeight);

      sectionsRef.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / window.innerHeight));
        
        setSections(prev => {
          const existing = prev.find(s => s.id === id);
          const newSection = {
            id,
            element,
            progress,
            isVisible,
            direction: 'down' as const
          };
          
          if (existing) {
            return prev.map(s => s.id === id ? newSection : s);
          }
          return [...prev, newSection];
        });
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    sections,
    currentSection,
    scrollProgress,
    registerSection
  };
};