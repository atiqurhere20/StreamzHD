"use client";
import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "@videojs/http-streaming";
import type Player from "video.js/dist/types/player";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, MonitorPlay, Settings, Activity } from "lucide-react";

interface Props {
  channelSlug: string;
  channelName: string;
  logoUrl?: string | null;
}

export default function VideoPlayer({ channelSlug, channelName, logoUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retries, setRetries] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [resolvedStreamUrl, setResolvedStreamUrl] = useState("");

  useEffect(() => {
    let active = true;
    async function resolveStream() {
      setIsLoading(true);
      setHasError(false);
      try {
        const res = await fetch(`/api/channels/resolve?slug=${channelSlug}`);
        const data = await res.json();
        if (!active) return;
        if (data.streamUrl) {
          // Wrap the URL with our proxy to bypass CORS restrictions
          const proxyUrl = `/api/channels/proxy?url=${encodeURIComponent(data.streamUrl)}`;
          setResolvedStreamUrl(proxyUrl);
        } else {
          setHasError(true);
          setErrorMessage("Failed to resolve stream URL.");
          setIsLoading(false);
        }
      } catch (err) {
        if (!active) return;
        setHasError(true);
        setErrorMessage("Network issue resolving stream location.");
        setIsLoading(false);
      }
    }
    resolveStream();
    return () => {
      active = false;
    };
  }, [channelSlug]);

  useEffect(() => {
    if (!videoRef.current || !resolvedStreamUrl) return;
    const isHls = /\.m3u8(\?|$)/i.test(resolvedStreamUrl);
    setHasError(false);
    setErrorMessage("");

    // Initial setup with videojs
    const player = videojs(videoRef.current, {
      controls: false, // Turn off default controls to use our own
      autoplay: true,
      preload: "auto",
      fluid: true,
      responsive: true,
      html5: { vhs: { overrideNative: true } },
      sources: [{ src: resolvedStreamUrl, type: isHls ? "application/x-mpegURL" : "video/mp4" }],
      poster: logoUrl || undefined,
    });

    playerRef.current = player;
  
      player.on("play", () => {
        setIsPlaying(true);
        setIsLoading(false);
        setHasError(false);
      });
      player.on("pause", () => setIsPlaying(false));
      player.on("volumechange", () => {
        setIsMuted(player.muted() || false);
        setVolume(player.volume() || 0);
      });
      player.on("waiting", () => setIsLoading(true));
      player.on("playing", () => setIsLoading(false));
      player.on("ratechange", () => setPlaybackRate(player.playbackRate() || 1));
      player.on("fullscreenchange", () => setIsFullscreen(player.isFullscreen() || false));
      player.on("enterpictureinpicture", () => setIsPip(true));
      player.on("leavepictureinpicture", () => setIsPip(false));
  
      player.on("error", () => {
        const err = player.error();
        console.error("VideoJS error:", err);
        setIsLoading(false);
        setHasError(true);
        
        let msg = "The stream could not be loaded due to a network or server issue.";
        if (err?.code === 4) {
          msg = "Stream format is unsupported, or access was blocked by CORS restrictions.";
        } else if (err?.code === 2) {
          msg = "A network error occurred while downloading the stream playlist.";
        }
        setErrorMessage(msg);

        if (retries < 3) {
          setTimeout(() => {
            setRetries((r) => r + 1);
            player.src({ src: resolvedStreamUrl, type: isHls ? "application/x-mpegURL" : "video/mp4" });
            player.play()?.catch(() => undefined);
          }, 3000);
        }
      });

    // Handle initial state
    player.ready(() => {
      setIsMuted(player.muted() || false);
      setVolume(player.volume() || 0);
      setIsLive(player.duration() === Infinity || player.duration() === 0);
      player.play()?.catch(() => undefined);
    });

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        changeVolume(Math.min(1, volume + 0.1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        changeVolume(Math.max(0, volume - 0.1));
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedStreamUrl]);

  // Autohide controls logic
  const triggerShowControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSettings(false);
      }
    }, 3500);
  };

  const handleMouseMove = () => triggerShowControls();
  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
      setShowSettings(false);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playerRef.current.paused()) {
      playerRef.current.play()?.catch(() => undefined);
    } else {
      playerRef.current.pause();
    }
    triggerShowControls();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    const currentMute = playerRef.current.muted();
    playerRef.current.muted(!currentMute);
    setIsMuted(!currentMute);
    triggerShowControls();
  };

  const changeVolume = (val: number) => {
    if (!playerRef.current) return;
    playerRef.current.volume(val);
    setVolume(val);
    if (val > 0) {
      playerRef.current.muted(false);
      setIsMuted(false);
    }
    triggerShowControls();
  };

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (playerRef.current.isFullscreen()) {
      playerRef.current.exitFullscreen();
      setIsFullscreen(false);
    } else {
      playerRef.current.requestFullscreen();
      setIsFullscreen(true);
    }
    triggerShowControls();
  };

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (e) {
      console.error(e);
    }
    triggerShowControls();
  };

  const handleReload = () => {
    if (!playerRef.current) return;
    setIsLoading(true);
    const isHls = /\.m3u8(\?|$)/i.test(resolvedStreamUrl);
    playerRef.current.src({ src: resolvedStreamUrl, type: isHls ? "application/x-mpegURL" : "video/mp4" });
    playerRef.current.play()?.catch(() => undefined);
    triggerShowControls();
  };

  const handleRateChange = (rate: number) => {
    if (!playerRef.current) return;
    playerRef.current.playbackRate(rate);
    setPlaybackRate(rate);
    setShowSettings(false);
    triggerShowControls();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={triggerShowControls}
      className="group relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border/80 select-none shadow-2xl shadow-primary/5"
    >
      {/* Video element */}
      <div className="w-full h-full pointer-events-none" data-vjs-player>
        <video
          ref={videoRef}
          className="video-js w-full h-full object-contain"
          playsInline
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          x-webkit-airplay="allow"
          aria-label={channelName}
        />
      </div>

      {/* Tap / Click Area to Play/Pause */}
      <div 
        onClick={(e) => {
          e.stopPropagation();
          if (!hasError) togglePlay();
        }}
        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-gradient-to-t from-black/40 via-transparent to-black/25"
      >
        {isLoading && !hasError && (
          <div className="flex flex-col items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 animate-fade-in">
            <Activity className="h-8 w-8 text-primary animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-text-muted">CONNECTING STREAM</span>
          </div>
        )}
        
        {hasError && (
          <div className="flex flex-col items-center gap-4 bg-black/80 backdrop-blur-md max-w-md mx-4 p-6 rounded-2xl border border-red-500/20 text-center animate-fade-in pointer-events-auto">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-1">
              <RotateCcw className="h-6 w-6 animate-spin-reverse" />
            </div>
            <div className="text-sm font-semibold text-white">Stream Loading Failed</div>
            <div className="text-xs text-text-muted leading-relaxed">{errorMessage}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReload();
              }}
              className="mt-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-lg transition"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>

      {/* Control Overlay */}
      <div
        className={`absolute inset-0 z-20 flex flex-col justify-between p-4 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top bar info */}
        <div className="flex items-center justify-between w-full pointer-events-auto">
          <div className="flex items-center gap-3 bg-black/65 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5">
            {isLive && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
                <span className="h-2 w-2 rounded-full bg-red-500 absolute" />
                <span className="text-[10px] font-bold tracking-wider text-white ml-1.5 uppercase">LIVE</span>
              </span>
            )}
            <span className="text-xs font-semibold text-white/95 max-w-[200px] truncate">{channelName}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReload();
              }}
              title="Refresh Stream"
              className="p-2 bg-black/65 hover:bg-black/80 backdrop-blur-md rounded-full text-white/90 hover:text-primary transition border border-white/5 pointer-events-auto"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom controls panel */}
        <div className="w-full flex flex-col gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 rounded-2xl pointer-events-auto">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Play / Pause */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-2.5 bg-primary hover:bg-primary/90 rounded-full text-white transition-all transform hover:scale-105"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
              </button>

              {/* Volume Controls */}
              <div className="flex items-center gap-1 group/volume">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="p-2 hover:bg-white/10 rounded-full text-white transition-colors duration-150"
                >
                  {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 ease-out flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      e.stopPropagation();
                      changeVolume(parseFloat(e.target.value));
                    }}
                    className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Right-aligned actions */}
            <div className="flex items-center gap-1.5">
              {/* Settings Trigger */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                  }}
                  className={`p-2 hover:bg-white/10 rounded-full text-white transition-colors duration-150 ${
                    showSettings ? "text-primary bg-white/5" : ""
                  }`}
                >
                  <Settings className="h-4.5 w-4.5" />
                </button>

                {showSettings && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-12 right-0 bg-black/95 backdrop-blur-md border border-white/10 rounded-xl p-2 w-32 shadow-2xl animate-fade-in flex flex-col gap-0.5 z-30"
                  >
                    <span className="text-[10px] font-bold text-text-dim px-2 py-1 uppercase tracking-wider">Speed</span>
                    {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleRateChange(rate)}
                        className={`text-xs text-left px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors duration-150 ${
                          playbackRate === rate ? "text-primary font-bold bg-primary/5" : "text-white/80"
                        }`}
                      >
                        {rate === 1 ? "Normal" : `${rate}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePip();
                }}
                title="Picture in Picture"
                className={`p-2 hover:bg-white/10 rounded-full text-white transition-colors duration-150 ${isPip ? "text-primary" : ""}`}
              >
                <MonitorPlay className="h-4.5 w-4.5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 hover:bg-white/10 rounded-full text-white transition-colors duration-150"
              >
                <Maximize className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
