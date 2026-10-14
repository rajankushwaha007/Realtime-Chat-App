import { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  UserRound,
} from "lucide-react";
import { useCallStore } from "../store/useCallStore";

const CallOverlay = () => {
  const {
    callStatus,
    callType,
    peerName,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [callSeconds, setCallSeconds] = useState(0);

  const isIncoming = callStatus === "incoming";
  const isVideo = callType === "video";

  // Start timer only after the call is connected.
  useEffect(() => {
    if (callStatus !== "active") {
      setCallSeconds(0);
      return;
    }

    const startedAt = Date.now();

    const updateTimer = () => {
      setCallSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [callStatus]);

  // Attach local camera stream.
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote video stream.
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((error) => {
        console.warn("Remote video playback:", error);
      });
    }
  }, [remoteStream]);

  // Audio-only calls need their own audio playback element.
  useEffect(() => {
    const audioElement = remoteAudioRef.current;

    if (!audioElement || !remoteStream || isVideo) return;

    audioElement.srcObject = remoteStream;

    audioElement.play().catch((error) => {
      console.warn("Remote audio playback failed:", error);
    });

    return () => {
      audioElement.pause();
      audioElement.srcObject = null;
    };
  }, [remoteStream, isVideo]);

  if (callStatus === "idle") return null;

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  };

  const statusText = isIncoming
    ? `Incoming ${isVideo ? "video" : "audio"} call`
    : callStatus === "active"
      ? "Connected"
      : callStatus === "connecting"
        ? "Connecting..."
        : "Calling...";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex min-h-[420px] w-full max-w-md flex-col items-center justify-between overflow-hidden rounded-2xl bg-base-100 p-6 shadow-2xl">
        {isVideo && !isIncoming && (
          <div className="absolute inset-0 bg-black">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />

            {!remoteStream && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                Waiting for video...
              </div>
            )}

            {localStream && (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute right-3 top-3 z-10 h-28 w-24 rounded-xl border border-white/40 bg-black object-cover"
              />
            )}
          </div>
        )}

        {/* Audio playback for audio-only calls */}
        {!isVideo && (
          <audio
            ref={remoteAudioRef}
            autoPlay
            playsInline
          />
        )}

        <div
          className={`relative z-20 flex w-full flex-col items-center ${
            isVideo && !isIncoming ? "text-white" : ""
          }`}
        >
          <div className="mb-4 flex size-24 items-center justify-center overflow-hidden rounded-full bg-base-300">
            {peerName ? (
              <span className="text-3xl font-semibold">
                {peerName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <UserRound size={42} />
            )}
          </div>

          <h2 className="text-xl font-semibold">
            {peerName || "Chat user"}
          </h2>

          <p className="mt-2 text-sm opacity-80">{statusText}</p>

          {callStatus === "active" && (
            <p className="mt-2 font-mono text-lg" aria-live="off">
              {formatTime(callSeconds)}
            </p>
          )}
        </div>

        {isVideo && isIncoming && remoteStream && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="relative z-10 mt-4 max-h-40 rounded-lg"
          />
        )}

        <div className="relative z-20 mt-8 flex flex-wrap items-center justify-center gap-4">
          {isIncoming ? (
            <>
              <button
                type="button"
                onClick={rejectCall}
                className="btn btn-circle btn-error"
                title="Reject call"
                aria-label="Reject call"
              >
                <PhoneOff size={22} />
              </button>

              <button
                type="button"
                onClick={acceptCall}
                className="btn btn-circle btn-success"
                title="Accept call"
                aria-label="Accept call"
              >
                <Phone size={22} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`btn btn-circle ${
                  isMuted ? "btn-warning" : "btn-ghost"
                }`}
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {isVideo && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`btn btn-circle ${
                    isCameraOff ? "btn-warning" : "btn-ghost"
                  }`}
                  title={isCameraOff ? "Turn camera on" : "Turn camera off"}
                  aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
                >
                  {isCameraOff ? (
                    <VideoOff size={20} />
                  ) : (
                    <Video size={20} />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={endCall}
                className="btn btn-circle btn-error"
                title="End call"
                aria-label="End call"
              >
                <PhoneOff size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;