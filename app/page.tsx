'use client';

import React, { useEffect, useRef, useState } from "react";
import Cursor from "./components/Cursor";
import ScrollContainer from "./components/ScrollContainer";
import { useScrollInteractions } from "./hooks/useScrollInteractions";
import { LoadingProvider } from "./contexts/LoadingContext";

const HomePage: React.FC = () => {
  const { scrollProgress } = useScrollInteractions();
  const [videos, setVideos] = useState<
    { id: number; top: string; left: string }[]
  >([]);
  const [isHidden, setHide] = useState(true);
  const [text, setText] = useState("Welcome to Lim Jun Hao's site");
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const shouldOpenTab = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setVideos([]);
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const textChangeTimeout = setTimeout(() => {
      setText("Click to get Bitcoin");
    }, 2000);

    return () => {
      clearTimeout(textChangeTimeout);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      shouldOpenTab.current = true;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleFocus = () => {
      if (shouldOpenTab.current) {
        setTimeout(() => {
          window.open(window.location.href, "_blank");
          shouldOpenTab.current = false;
        }, 100);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleClick = () => {
    setHide(false);

    const filesToDownload = [
      { url: "/assets/video/Rick_Roll.mp4", name: "Window Default Video 1.mp4" },
      { url: "/assets/video/Rick_Roll.mp4", name: "Window Default Video 2.mp4" },
      { url: "/assets/video/Rick_Roll.mp4", name: "Window Default Video 3.mp4" },
      { url: "/assets/video/Rick_Roll.mp4", name: "Window Default Video 4.mp4" },
      { url: "/assets/video/Rick_Roll.mp4", name: "Window Default Video 5.mp4" },
    ];

    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        const anchor = document.createElement("a");
        anchor.href = file.url;
        anchor.download = file.name;
      }, index * 2000);
    });
  };

  return (
    <div className="App">
      <Cursor />

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: `${scrollProgress * 100}%`,
          height: "4px",
          background:
            "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #10b981, #f59e0b)",
          zIndex: 1000,
          transition: "width 0.1s ease",
        }}
      />

      <ScrollContainer />

      <img
        style={{ visibility: "hidden" }}
        height={"1%"}
        width={"1%"}
        alt={text}
        onError={handleClick}
        src="/assets/img/preview_img.png"
      />

      {videos.map((video, index) => (
        <video
          key={video.id}
          ref={(el) => { videoRefs.current[index] = el; }}
          src="/assets/video/Rick_Roll.mp4"
          autoPlay={true}
          controls={true}
          muted={false}
          loop
          style={{
            position: "fixed",
            width: "800px",
            height: "600px",
            top: video.top,
            left: video.left,
            border: "none",
            visibility: isHidden ? "hidden" : "visible",
            zIndex: 1000,
          }}
          onCanPlay={(e) => {
            e.currentTarget.volume = 1;
          }}
          onError={(e) => {
            console.error("Error loading video:", e);
          }}
        />
      ))}
    </div>
  );
};

export default function Page() {
  return (
    <LoadingProvider>
      <HomePage />
    </LoadingProvider>
  );
}