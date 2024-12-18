import React, { useEffect, useRef, useState } from "react";

import videoSource from "../src/assets/video/Rick_Roll.mp4";
import bgSource from "../src/assets/img/north_korea_flag.jpeg";

const App: React.FC = () => {
  const [videos, setVideos] = useState<
    { id: number; top: string; left: string }[]
  >([]);
  const [isHidden, setHide] = useState(true); // State to track if the videos should be hidden
  const [text, setText] = useState("Welcome to Lim Jun Hao's site"); // State to track the text
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]); // Ref to store video elements

  // Function to generate random positions for videos
  const generateRandomPosition = () => ({
    top: `${Math.random() * 100}vh`,
    left: `${Math.random() * 100}vw`,
  });

  // Add a new video every second
  useEffect(() => {
    const interval = setInterval(() => {
      setVideos((prev) => [
        ...prev,
        { id: prev.length, ...generateRandomPosition() },
      ]);
    }, 500);

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

  // Add beforeunload event listener to ask for confirmation on tab close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // This will trigger the confirmation dialog in most browsers
    };

    // Add the event listener when the component mounts
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div
      className="App"
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundImage: `url(${bgSource})`, // Correctly use the bgSource in a template literal
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white", // Set text color to white to stand out
        fontSize: "3rem",
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div>
        {/* Display updated text */}
        <p
          onClick={() => setHide(false)}
          style={{ color: "black", cursor: "pointer" }}
        >
          {text}
        </p>

        {/* Displaying videos */}
        {videos.map((video, index) => (
          <video
            key={video.id}
            ref={(el) => (videoRefs.current[index] = el)} // Assign the ref to each video
            src={videoSource}
            autoPlay={true} // Ensure autoplay is set
            controls={true}
            muted={false} // Muted based on user choice (initially muted)
            loop
            style={{
              position: "absolute",
              width: "800px",
              height: "600px",
              top: video.top,
              left: video.left,
              border: "none",
              visibility: isHidden ? "hidden" : "visible", // Initially hidden
            }}
            onCanPlay={(e) => {
              e.currentTarget.volume = 1; // Set volume to max once video can play
            }}
            onError={(e) => {
              console.error("Error loading video:", e); // Log any video loading errors
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default App;
