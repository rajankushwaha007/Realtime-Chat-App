import { useEffect, useRef, useState } from "react";
import { Plus, X, Type, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Heart, Video, } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useStatusStore } from "../store/useStatusStore";

const StatusSection = ({ initialDraft }) => {
  const { authUser, socket } = useAuthStore();
  const {
    statuses,
    isLoading,
    isCreating,
    fetchStatuses,
    createTextStatus,
    createImageStatus,
    createVideoStatus,
    markStatusViewed,
    deleteStatus,
    toggleStatusLike,
  } = useStatusStore();

  const [showComposer, setShowComposer] = useState(false);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  const [imageFilter, setImageFilter] = useState("none");
  const [imageRotation, setImageRotation] = useState(0);
  const [imageOverlayText, setImageOverlayText] = useState("");
  const [imageEmoji, setImageEmoji] = useState("");


  useEffect(() => {
    if (!initialDraft) return;

    if (initialDraft.type === "text") {
      setUploadingType("text");
      setText(initialDraft.text || "");
      setShowComposer(true);
    }
  }, [initialDraft]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [uploadingType, setUploadingType] = useState("text");
  const [likedStatuses, setLikedStatuses] = useState({});
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const [showStatusActivity, setShowStatusActivity] = useState(false);
  const touchStartY = useRef(0);
  const [statusProgress, setStatusProgress] = useState(0);
  const statusTimerRef = useRef(null);


  useEffect(() => {
    if (!selectedStatus) {
      setStatusProgress(0);
      return;
    }

    setStatusProgress(0);

    if (statusTimerRef.current) {
      clearInterval(statusTimerRef.current);
      statusTimerRef.current = null;
    }

    // Video ka next status video khatam hone par khulega.
    if (selectedStatus.type === "video") {
      return () => {
        if (statusTimerRef.current) {
          clearInterval(statusTimerRef.current);
          statusTimerRef.current = null;
        }
      };
    }

    // Image aur text status ka timer.
    const duration = 7000;
    const startedAt = Date.now();

    statusTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setStatusProgress(progress);

      if (elapsed >= duration) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;

        if (currentIndex < activeStatuses.length - 1) {
          openStatus(activeStatuses[currentIndex + 1]);
        } else {
          setSelectedStatus(null);
        }
      }
    }, 50);

    return () => {
      if (statusTimerRef.current) {
        clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
      }
    };
  }, [selectedStatus?._id]);


  useEffect(() => {
    fetchStatuses();

    if (!socket) return;

    const handleStatusUpdate = () => fetchStatuses(false);
    socket.on("statusUpdated", handleStatusUpdate);

    return () => socket.off("statusUpdated", handleStatusUpdate);
  }, [fetchStatuses, socket]);

  const myStatuses = statuses.filter(
    (status) => String(status.userId?._id) === String(authUser?._id)
  );

  const otherStatuses = statuses.filter(
    (status) => String(status.userId?._id) !== String(authUser?._id)
  );

  const openStatus = async (status) => {
    setSelectedStatus(status);
    setShowStatusActivity(false);
    await markStatusViewed(status._id);
  };

  const submitText = async (event) => {
    event.preventDefault();
    const success = await createTextStatus(text);
    if (success) {
      setText("");
      setShowComposer(false);
    }
  };


  const handleImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      setSelectedImage(reader.result);
      setUploadingType("image");
    };

    reader.readAsDataURL(file);
  };

  const submitImage = async () => {
    if (!selectedImage || isCreating) return;

    const success = await createImageStatus(selectedImage);

    if (success) {
      setSelectedImage("");
      setShowComposer(false);
      setUploadingType("text");
    }
  };


  const exportEditedImage = () => {
    return new Promise((resolve, reject) => {
      if (!selectedImage) {
        resolve("");
        return;
      }

      const image = new Image();

      image.onload = () => {
        try {
          const rotation = ((imageRotation % 360) + 360) % 360;
          const sideways = rotation === 90 || rotation === 270;

          const canvas = document.createElement("canvas");
          canvas.width = sideways ? image.naturalHeight : image.naturalWidth;
          canvas.height = sideways ? image.naturalWidth : image.naturalHeight;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Could not create image editor"));
            return;
          }

          const filters = {
            none: "none",
            grayscale: "grayscale(1)",
            sepia: "sepia(0.85)",
            warm: "saturate(1.4) sepia(0.2)",
            bright: "brightness(1.2)",
            contrast: "contrast(1.25)",
          };

          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.filter = filters[imageFilter] || "none";

          ctx.drawImage(
            image,
            -image.naturalWidth / 2,
            -image.naturalHeight / 2,
            image.naturalWidth,
            image.naturalHeight
          );

          ctx.filter = "none";

          if (imageEmoji) {
            ctx.font = `${Math.max(36, canvas.width * 0.12)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(imageEmoji, 0, -canvas.height * 0.2);
          }

          if (imageOverlayText.trim()) {
            const fontSize = Math.max(20, Math.min(42, canvas.width * 0.07));

            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = Math.max(3, fontSize * 0.12);
            ctx.strokeStyle = "rgba(0,0,0,0.8)";
            ctx.fillStyle = "#ffffff";

            const words = imageOverlayText.trim().split(/\s+/);
            const lines = [];
            let line = "";

            for (const word of words) {
              const candidate = line ? `${line} ${word}` : word;

              if (ctx.measureText(candidate).width > canvas.width * 0.85 && line) {
                lines.push(line);
                line = word;
              } else {
                line = candidate;
              }
            }

            if (line) lines.push(line);

            const lineHeight = fontSize * 1.3;
            const startY = ((lines.length - 1) * lineHeight) / 2;

            lines.forEach((item, index) => {
              const y = startY * -1 + index * lineHeight;

              ctx.strokeText(item, 0, y);
              ctx.fillText(item, 0, y);
            });
          }

          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(new Error("Could not load selected image"));
      image.src = selectedImage;
    });
  };

  const shareEditedImage = async () => {
    if (!selectedImage || isCreating) return;

    try {
      const editedImage = await exportEditedImage();
      if (!editedImage) return;

      const success = await createImageStatus(editedImage);

      if (success) {
        setSelectedImage("");
        setImageFilter("none");
        setImageRotation(0);
        setImageOverlayText("");
        setImageEmoji("");
        setShowComposer(false);
        setUploadingType("text");
      }
    } catch (error) {
      console.error("Image editing failed:", error);
      alert("Photo edit nahi ho payi. Please try another image.");
    }
  };

  const handleVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a video file.");
      return;
    }


    if (file.size > 100 * 1024 * 1024) {
      alert("Video must be 100 MB or smaller.");
      return;
    }


    const previewUrl = URL.createObjectURL(file);
    const videoElement = document.createElement("video");

    videoElement.preload = "metadata";
    videoElement.src = previewUrl;

    videoElement.onloadedmetadata = () => {
      const duration = videoElement.duration;
      URL.revokeObjectURL(previewUrl);

      if (!Number.isFinite(duration) || duration <= 0) {
        alert("Unable to read video duration.");
        return;
      }

      if (duration > 60) {
        alert("Video must be 60 seconds or shorter.");
        return;
      }

      const reader = new FileReader();

      reader.onload = async () => {
        if (typeof reader.result !== "string") return;

        const success = await createVideoStatus(reader.result);

        if (success) {
          setShowComposer(false);
        }
      };

      reader.onerror = () => {
        alert("Failed to read video file.");
      };

      reader.readAsDataURL(file);
    };

    videoElement.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      alert("Unable to read this video file.");
    };
  };


  const activeStatuses = statuses;

  const currentIndex = activeStatuses.findIndex(
    (status) => status._id === selectedStatus?._id
  );

  const moveStatus = (direction) => {
    const next = activeStatuses[currentIndex + direction];

    if (next) {
      openStatus(next);
    } else if (direction > 0) {
      setSelectedStatus(null);
    }
  };


  const isStatusLiked = (status) => {
    if (!status) return false;

    if (Object.prototype.hasOwnProperty.call(likedStatuses, status._id)) {
      return likedStatuses[status._id];
    }

    return (status?.reactions || []).some(
      (reaction) =>
        String(
          typeof reaction.userId === "object"
            ? reaction.userId?._id
            : reaction.userId
        ) === String(authUser?._id) &&
        reaction.emoji === "❤️"
    );
  };
  return (
    <section className="border-b border-base-300 px-3 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Status</h2>
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="btn btn-ghost btn-xs gap-1"
        >
          <Plus size={16} />
          Add status
        </button>
      </div>


      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (myStatuses.length > 0) {
                  openStatus(myStatuses[myStatuses.length - 1]);
                }
              }}
              className="rounded-full"
              aria-label="View my status"
            >
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt="Your profile"
                className="size-14 rounded-full border-2 border-base-300 object-cover p-0.5"
              />
            </button>

            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-base-100 bg-primary text-primary-content"
              aria-label="Add status"
            >
              <Plus size={12} />
            </button>
          </div>

          <span className="w-full truncate text-center text-xs">
            My status
          </span>

          {myStatuses.length > 0 && (
            <span className="text-[10px] opacity-60">
              {myStatuses.length} update{myStatuses.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {otherStatuses.map((status) => (
          <button
            key={status._id}
            type="button"
            onClick={() => openStatus(status)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <div
              className={`flex size-14 items-center justify-center rounded-full border-2 p-0.5 ${status.hasViewed
                ? "border-gray-400"
                : "border-green-500"
                }`}
            >
              {status.type === "image" ? (
                <img
                  src={status.mediaUrl}
                  alt="User status"
                  className="size-full rounded-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-pink-600 px-1 text-center text-[9px] text-white">
                  {status.text}
                </span>
              )}
            </div>

            <span className="w-full truncate text-center text-xs">
              {status.userId?.fullName || "User"}
            </span>
          </button>
        ))}

        {showComposer && (
          <div className="fixed inset-0 z-[60] flex items-stretch justify-center overflow-hidden bg-black p-0">
            <div className="flex h-full w-full max-w-none flex-col overflow-y-auto bg-neutral-950 p-4 text-white sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Create status</h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowComposer(false);
                    setSelectedImage("");
                    setUploadingType("text");
                  }}
                  className="btn btn-ghost btn-circle btn-sm"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUploadingType("text")}
                  className={`btn ${uploadingType === "text" ? "btn-primary" : "btn-ghost"}`}
                >
                  <Type size={18} />
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn btn-ghost"
                  disabled={isCreating}
                >
                  <ImageIcon size={18} />
                  Photo
                </button>

                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  className="btn btn-ghost"
                  disabled={isCreating}
                >
                  <Video size={18} />
                  Video
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                />

                <input
                  ref={videoRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideo}
                />

              </div>

              {uploadingType === "text" && (
                <form onSubmit={submitText}>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={700}
                    placeholder="What's on your mind?"
                    className="textarea textarea-bordered min-h-36 w-full"
                    required
                  />
                  <div className="mt-1 text-right text-xs opacity-60">
                    {text.length}/700
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating || !text.trim()}
                    className="btn btn-primary mt-3 w-full"
                  >
                    {isCreating ? "Posting..." : "Share status"}
                  </button>
                </form>
              )}


              {uploadingType === "image" && (
                <div className="flex min-h-0 flex-1 flex-col gap-4">
                  <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black">
                    {selectedImage && (
                      <div className="relative flex max-h-full max-w-full items-center justify-center">
                        <img
                          src={selectedImage}
                          alt="Photo preview"
                          className="max-h-[45vh] max-w-full object-contain sm:max-h-[52vh]"
                          style={{
                            filter:
                              {
                                none: "none",
                                grayscale: "grayscale(1)",
                                sepia: "sepia(0.85)",
                                warm: "saturate(1.4) sepia(0.2)",
                                bright: "brightness(1.2)",
                                contrast: "contrast(1.25)",
                              }[imageFilter] || "none",
                            transform: `rotate(${imageRotation}deg)`,
                          }}
                        />

                        {imageEmoji && (
                          <span className="absolute left-1/2 top-[25%] -translate-x-1/2 text-5xl">
                            {imageEmoji}
                          </span>
                        )}

                        {imageOverlayText && (
                          <span className="absolute left-1/2 top-1/2 w-[85%] -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap break-words text-center text-xl font-bold text-white [text-shadow:0_2px_5px_black,0_0_3px_black]">
                            {imageOverlayText}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Photo filters</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ["none", "Original"],
                        ["grayscale", "B&W"],
                        ["sepia", "Vintage"],
                        ["warm", "Warm"],
                        ["bright", "Bright"],
                        ["contrast", "Contrast"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setImageFilter(value)}
                          className={`rounded-full border px-3 py-2 text-sm ${imageFilter === value
                              ? "border-pink-400 bg-pink-600"
                              : "border-white/30 bg-white/10"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Add text
                    </label>
                    <input
                      value={imageOverlayText}
                      onChange={(event) => setImageOverlayText(event.target.value)}
                      maxLength={150}
                      placeholder="Write something on your photo..."
                      className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-white outline-none placeholder:text-white/50"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Add emoji</p>
                    <div className="flex flex-wrap gap-2">
                      {["❤️", "😂", "🔥", "😍", "🥹", "✨", "😎", "🎉", "💯", "🌹"].map(
                        (emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              setImageEmoji((current) => current === emoji ? "" : emoji)
                            }
                            className={`rounded-lg p-2 text-2xl ${imageEmoji === emoji ? "bg-pink-600" : "bg-white/10"
                              }`}
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImageRotation((rotation) => (rotation + 90) % 360)}
                      disabled={isCreating}
                      className="flex-1 rounded-xl bg-white/10 px-3 py-3"
                    >
                      ↻ Rotate
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage("");
                        setImageFilter("none");
                        setImageRotation(0);
                        setImageOverlayText("");
                        setImageEmoji("");
                        setUploadingType("text");
                      }}
                      disabled={isCreating}
                      className="flex-1 rounded-xl bg-white/10 px-3 py-3"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={shareEditedImage}
                      disabled={isCreating || !selectedImage}
                      className="flex-1 rounded-xl bg-green-600 px-3 py-3 font-semibold disabled:opacity-50"
                    >
                      {isCreating ? "Posting..." : "Share Status"}
                    </button>
                  </div>
                </div>
              )}


              <p className="mt-3 text-center text-xs opacity-60">
                Statuses disappear after 24 hours.
              </p>
            </div>
          </div>
        )}

        {selectedStatus && (
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-900 text-white">
            <div
              onTouchStart={(event) => {
                touchStartY.current = event.touches[0].clientY;
              }}
              onTouchEnd={(event) => {
                const difference =
                  touchStartY.current - event.changedTouches[0].clientY;

                if (difference > 50 &&
                  String(selectedStatus.userId?._id) === String(authUser?._id)) {
                  setShowStatusActivity(true);
                }

                if (difference < -50) {
                  setShowStatusActivity(false);
                }
              }}
              className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-900 text-white"
            >

              <div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
                {activeStatuses.map((status, index) => (
                  <div
                    key={status._id}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/40"
                  >
                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width:
                          index < currentIndex
                            ? "100%"
                            : index === currentIndex
                              ? `${statusProgress}%`
                              : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>


              <div className="relative z-10 flex items-center gap-3 px-4 pb-3 pt-7">
                <img
                  src={selectedStatus.userId?.profilePic || "/avatar.png"}
                  alt=""
                  className="size-10 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {selectedStatus.userId?.fullName || "Status"}
                  </p>
                  <p className="text-xs text-white/60">
                    {new Date(selectedStatus.createdAt).toLocaleString()}
                  </p>
                </div>

                {String(selectedStatus.userId?._id) === String(authUser?._id) &&
                  showStatusActivity && (
                    <button
                      type="button"
                      onClick={async () => {
                        const id = selectedStatus._id;
                        const success = await deleteStatus(id);
                        if (success) setSelectedStatus(null);
                      }}
                      className="btn btn-ghost btn-circle btn-sm text-white"
                      aria-label="Delete status"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => setSelectedStatus(null)}
                  className="btn btn-ghost btn-circle btn-sm text-white"
                  aria-label="Close status"
                >
                  <X size={20} />
                </button>
              </div>

              <div
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-2"
              >
                {selectedStatus.type === "video" ? (
                  <video
                    src={selectedStatus.mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    onTimeUpdate={(event) => {
                      const video = event.currentTarget;

                      if (video.duration > 0) {
                        setStatusProgress(
                          (video.currentTime / video.duration) * 100
                        );
                      }
                    }}
                    onEnded={() => moveStatus(1)}
                    className="h-full w-full object-contain"
                  />
                ) : selectedStatus.type === "image" ? (
                  <img
                    src={selectedStatus.mediaUrl}
                    alt="Shared status"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-6">
                    <p className="break-words text-center text-2xl font-bold sm:text-3xl">
                      {selectedStatus.text}
                    </p>
                  </div>
                )}
              </div>


              {/* YAHAN BUTTON ADD KARO */}
              {String(selectedStatus.userId?._id) === String(authUser?._id) && (
                <button
                  type="button"
                  onClick={() => setShowStatusActivity((prev) => !prev)}
                  className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/20 px-4 py-2 text-sm text-white"
                >
                  {showStatusActivity ? "Close viewers ↑" : "^"}
                </button>
              )}

              {/* Iske baad tumhara existing Status activity section rahega */}
              {String(selectedStatus.userId?._id) === String(authUser?._id) &&
                showStatusActivity && (
                  <div className="absolute bottom-16 left-3 right-3 z-20 mx-3 mb-3 max-h-[45%] overflow-y-auto rounded-xl bg-neutral-800 p-3 shadow-xl">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Status activity</h3>
                      <span className="text-xs text-white/70">
                        👁️ {selectedStatus.viewers?.length || 0} views
                      </span>
                    </div>

                    <div className="max-h-36 space-y-2 overflow-y-auto">
                      {(selectedStatus.viewers || []).map((viewer, index) => (
                        <div
                          key={viewer.userId?._id || index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <img
                            src={viewer.userId?.profilePic || "/avatar.png"}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />

                          <span className="min-w-0 flex-1 truncate">
                            {viewer.userId?.fullName || "User"}
                          </span>

                          <span className="text-xs text-white/60">
                            {viewer.viewedAt
                              ? new Date(viewer.viewedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              : ""}
                          </span>
                        </div>
                      ))}

                      {(!selectedStatus.viewers || selectedStatus.viewers.length === 0) && (
                        <p className="text-xs text-white/60">
                          Abhi kisi ne status nahi dekha.
                        </p>
                      )}
                    </div>

                    <div className="my-3 border-t border-white/10" />

                    <h4 className="mb-2 text-sm font-semibold">
                      ❤️ Liked by {(selectedStatus.reactions || []).filter(
                        (reaction) => reaction.emoji === "❤️"
                      ).length}
                    </h4>

                    <div className="flex flex-wrap gap-2">
                      {(selectedStatus.reactions || [])
                        .filter((reaction) => reaction.emoji === "❤️")
                        .map((reaction, index) => (
                          <div
                            key={reaction.userId?._id || index}
                            className="flex items-center gap-2 rounded-full bg-white/10 px-2 py-1"
                          >
                            <img
                              src={reaction.userId?.profilePic || "/avatar.png"}
                              alt=""
                              className="size-6 rounded-full object-cover"
                            />
                            <span className="max-w-28 truncate text-xs">
                              {reaction.userId?.fullName || "User"}
                            </span>
                          </div>
                        ))}

                      {!(selectedStatus.reactions || []).some(
                        (reaction) => reaction.emoji === "❤️"
                      ) && (
                          <p className="text-xs text-white/60">
                            Abhi kisi ne Like nahi kiya.
                          </p>
                        )}
                    </div>
                  </div>
                )}

              <div className="border-t border-white/10 p-3">
                {String(selectedStatus.userId?._id) !== String(authUser?._id) && (
                  <div className="mb-3 flex justify-center">
                    <button
                      type="button"
                      onClick={async () => {
                        const statusId = selectedStatus._id;
                        const wasLiked = isStatusLiked(selectedStatus);

                        setLikedStatuses((prev) => ({
                          ...prev,
                          [statusId]: !wasLiked,
                        }));

                        const result = await toggleStatusLike(statusId);

                        if (result === false) {
                          setLikedStatuses((prev) => ({
                            ...prev,
                            [statusId]: wasLiked,
                          }));
                        }
                      }}
                      className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 transition hover:bg-white/20"
                    >
                      <Heart
                        size={23}
                        fill={isStatusLiked(selectedStatus) ? "currentColor" : "none"}
                        className={isStatusLiked(selectedStatus) ? "text-red-500" : "text-white"}
                      />
                      {isStatusLiked(selectedStatus) ? "Liked" : "Like"}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => moveStatus(-1)}
                    disabled={currentIndex <= 0}
                    className="btn btn-ghost btn-sm text-white"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>

                  <span className="text-xs text-white/60">
                    {currentIndex + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => moveStatus(1)}
                    disabled={currentIndex < 0 || currentIndex >= activeStatuses.length - 1}
                    className="btn btn-ghost btn-sm text-white"
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default StatusSection;
