'use client';

import React, { useEffect, useRef } from 'react';

const Cursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorFollower = cursorFollowerRef.current;

    if (!cursor || !cursorFollower) return;

    const onMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      
      // Check if the cursor is over a clickable element
      const target = e.target as HTMLElement;
      const isClickable = 
        target.tagName === 'A' || 
        target.tagName === 'BUTTON' || 
        target.closest('a') || 
        target.closest('button') ||
        target.classList.contains('hover-link');
      
      // Update cursor position
      cursor.style.transform = `translate(${clientX - 10}px, ${clientY - 10}px)`;
      
      // Update follower with some delay
      requestAnimationFrame(() => {
        cursorFollower.style.transform = `translate(${clientX - 20}px, ${clientY - 20}px)`;
      });
      
      // Change cursor style for clickable elements
      if (isClickable) {
        cursor.style.transform = `translate(${clientX - 10}px, ${clientY - 10}px) scale(1.5)`;
        cursorFollower.style.transform = `translate(${clientX - 20}px, ${clientY - 20}px) scale(1.5)`;
        cursor.style.backgroundColor = 'white';
      } else {
        cursor.style.backgroundColor = 'var(--color-primary)';
      }
    };

    document.addEventListener('mousemove', onMouseMove);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <>
      <div ref={cursorRef} className="cursor"></div>
      <div ref={cursorFollowerRef} className="cursor-follower"></div>
    </>
  );
};

export default Cursor;