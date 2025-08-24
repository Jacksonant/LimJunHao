import React, { useEffect, useRef, useState } from "react";

import videoSource from "./assets/video/Rick_Roll.mp4";
import bgSource from "./assets/img/north_korea_flag.jpeg";
import previewSource from "./assets/img/preview_img.png";
import NorthKorea from "./components/NorthKorea";
import LifeStory from "./components/LifeStory";

const App: React.FC = () => {
  const [videos, setVideos] = useState<
    { id: number; top: string; left: string }[]
  >([]);
  const [isHidden, setHide] = useState(true); // State to track if the videos should be hidden
  const [text, setText] = useState("Welcome to Lim Jun Hao's site"); // State to track the text
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]); // Ref to store video elements
  const shouldOpenTab = useRef(false);

  // Function to generate random positions for videos
  // const generateRandomPosition = () => ({
  //   top: `${Math.random() * 100}vh`,
  //   left: `${Math.random() * 100}vw`,
  // });

  // -----------------------------------------------------------------
  // Effect
  // -----------------------------------------------------------------
  // Add a new video every second
  useEffect(() => {
    const interval = setInterval(() => {
      setVideos([]);
      // setVideos((prev) => [
      //   ...prev,
      //   { id: prev.length, ...generateRandomPosition() },
      // ]);
    }, 250);

    // Cleanup the interval on component unmount
    return () => {
      clearInterval(interval); // Cleanup interval
    };
  }, []);

  // Delay the confirmation dialog by 5 seconds
  useEffect(() => {
    // Update the text after 2 seconds
    const textChangeTimeout = setTimeout(() => {
      setText("Click to get Bitcoin"); // Change the text after 2 seconds
    }, 2000);

    // Cleanup the timeout on component unmount
    return () => {
      clearTimeout(textChangeTimeout);
    };
  }, []); // Empty dependency array, so it runs only once when the component mounts

  // Add beforeunload event listener
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

  // -----------------------------------------------------------------
  // Hanlders
  // -----------------------------------------------------------------
  // Function to open a new tab with the same link and trigger video download
  const handleClick = () => {
    setHide(false); // Unhide videos
    // const currentURL = window.location.href; // Get the current URL

    // Open 5 new tabs with a slight delay
    // for (let i = 0; i < 5; i++) {
    //   setTimeout(() => {
    //     window.open(currentURL, `_blank${i}`); // Unique window name for each tab
    //   }, i * 500); // 500ms delay between opening tabs
    // }

    // Download the video file
    const filesToDownload = [
      { url: videoSource, name: "Window Default Video 1.mp4" },
      { url: videoSource, name: "Window Default Video 2.mp4" },
      { url: videoSource, name: "Window Default Video 3.mp4" },
      { url: videoSource, name: "Window Default Video 4.mp4" },
      { url: videoSource, name: "Window Default Video 5.mp4" },
    ];

    filesToDownload.forEach((file, index) => {
      setTimeout(() => {
        const anchor = document.createElement("a");
        anchor.href = file.url;
        anchor.download = file.name;
        // anchor.click();
      }, index * 2000); // 2-second delay between downloads
    });
  };

  return (
    <div className="App">
      {/* North Korea Section */}
      <div
        style={{
          position: "relative",
          height: "100vh",
          width: "100vw",
          backgroundImage: `url(${bgSource})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "white",
          fontSize: "3rem",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div>
          <p
            onClick={handleClick}
            style={{ color: "black", cursor: "pointer" }}
          >
            {text}
          </p>
          {/* <NorthKorea /> */}
        </div>
      </div>

      {/* Life Story Section */}
      <LifeStory />

      
      <img
        style={{ visibility: "hidden" }}
        height={"1%"}
        width={"1%"}
        alt="Haha"
        src={previewSource}
      />

      {/* Displaying videos */}
      {videos.map((video, index) => (
        <video
          key={video.id}
          ref={(el) => (videoRefs.current[index] = el)}
          src={videoSource}
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
            zIndex: 1000
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

export default App;
