'use client';

import React, { useEffect, useRef } from "react";
import { useScrollInteractions } from "../hooks/useScrollInteractions";
import NorthKorea from "./NorthKorea";
import MySection from "./MySection";

const ScrollContainer: React.FC = () => {
  const { registerSection, scrollProgress } = useScrollInteractions();
  const heroRef = useRef<HTMLDivElement>(null);
  const myRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) registerSection("hero", heroRef.current);
    if (myRef.current) registerSection("my", myRef.current);
  }, [registerSection]);

  return (
    <div className="scroll-container">
      {/* Progress Bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: `${scrollProgress * 100}%`,
          height: "3px",
          background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)",
          zIndex: 1000,
          transition: "width 0.1s ease",
        }}
      />

      {/* Section Navigation */}
      <nav
        style={{
          position: "fixed",
          right: "2rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {["Tank", "About"].map((name, index) => {
          const refs = [heroRef, myRef];
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: "pointer",
              }}
              onClick={() => {
                refs[index].current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div
                style={{
                  width: scrollProgress > index * 0.5 ? "40px" : "20px",
                  height: "3px",
                  background:
                    scrollProgress > index * 0.5
                      ? "#6366f1"
                      : "rgba(255,255,255,0.5)",
                  borderRadius: "2px",
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  color:
                    scrollProgress > index * 0.5
                      ? "#6366f1"
                      : "rgba(255,255,255,0.7)",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  opacity: scrollProgress > index * 0.5 ? 1 : 0,
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Hero Section */}
      <div ref={heroRef} id="hero-section">
        <NorthKorea />
      </div>

      {/* My Section */}
      <div ref={myRef} id="my-section">
        <MySection />
      </div>
    </div>
  );
};

export default ScrollContainer;
