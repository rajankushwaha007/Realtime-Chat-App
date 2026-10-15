import { useEffect, useRef, useState } from "react";
import { Plus, X, Type, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Heart, } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useStatusStore } from "../store/useStatusStore";

const StatusSection = () => {
  const { authUser, socket } = useAuthStore();
  const {
    statuses,
    isLoading,
    isCreating,
    fetchStatuses,
    createTextStatus,
    createImageStatus,
    markStatusViewed,
    deleteStatus,
    toggleStatusLike,
  } = useStatusStore();

  const [showComposer, setShowComposer] = useState(false);
  const [text, setText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [uploadingType, setUploadingType] = useState("text");
  const [likedStatuses, setLikedStatuses] = useState({});
  const fileRef = useRef(null);

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

  const handleImage = async (event) => {
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

    reader.onload = async () => {
      if (typeof reader.result !== "string") return;
      const success = await createImageStatus(reader.result);
      if (success) setShowComposer(false);
    };

    reader.readAsDataURL(file);
  };

  const activeStatuses = selectedStatus
    ? statuses.filter(
      (status) =>
        String(status.userId?._id) === String(selectedStatus.userId?._id)
    )
    : [];

  const currentIndex = activeStatuses.findIndex(
    (status) => status._id === selectedStatus?._id
  );

  const moveStatus = (direction) => {
    const next = activeStatuses[currentIndex + direction];
    if (next) openStatus(next);
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
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <div className="relative">
            <img
              src={authUser?.profilePic || "/avatar.png"}
              alt="Your profile"
              className="size-14 rounded-full border-2 border-base-300 object-cover p-0.5"
            />
            <span className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-base-100 bg-primary text-primary-content">
              <Plus size={12} />
            </span>
          </div>
          <span className="w-full truncate text-xs">My status</span>
          {myStatuses.length > 0 && (
            <span className="text-[10px] opacity-60">
              {myStatuses.length} update{myStatuses.length > 1 ? "s" : ""}
            </span>
          )}
        </button>


        {otherStatuses.map((status) => {
          const userStatuses = otherStatuses.filter(
            (item) =>
              String(item.userId?._id) === String(status.userId?._id)
          );

          const allViewed = userStatuses.every(
            (item) => item.hasViewed === true
          );
          return (
            <button
              type="button"
              key={status._id}
              onClick={() => openStatus(status)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <div
                className={`rounded-full border-2 p-0.5 ${allViewed ? "border-gray-400" : "border-green-500"
                  }`}
              >
                <img
                  src={status.userId?.profilePic || "/avatar.png"}
                  alt={status.userId?.fullName || "Contact"}
                  className="size-12 rounded-full object-cover"
                />
              </div>

              <span className="w-full truncate text-xs">
                {status.userId?.fullName || "Contact"}
              </span>
            </button>
          );
        })}


        {!isLoading && otherStatuses.length === 0 && (
          <p className="self-center text-xs opacity-50">
            No other statuses yet
          </p>
        )}
      </div>

      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-base-100 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create status</h3>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className="btn btn-ghost btn-circle btn-sm"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
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
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
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

            <p className="mt-3 text-center text-xs opacity-60">
              Statuses disappear after 24 hours.
            </p>
          </div>
        </div>
      )}

      {selectedStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-3 sm:p-6">
          <div className="relative flex h-full max-h-[800px] w-full max-w-md flex-col overflow-hidden rounded-xl bg-neutral-900 text-white">
            <div className="absolute left-3 right-3 top-3 z-10 flex gap-1">
              {activeStatuses.map((status) => (
                <div
                  key={status._id}
                  className={`h-1 flex-1 rounded-full ${status._id === selectedStatus._id
                    ? "bg-white"
                    : "bg-white/40"
                    }`}
                />
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

              {String(selectedStatus.userId?._id) === String(authUser?._id) && (
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

            <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-5">
              {selectedStatus.type === "image" ? (
                <img
                  src={selectedStatus.mediaUrl}
                  alt="Shared status"
                  className="max-h-full max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex min-h-64 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-6">
                  <p className="break-words text-center text-2xl font-bold sm:text-3xl">
                    {selectedStatus.text}
                  </p>
                </div>
              )}
            </div>

            {String(selectedStatus.userId?._id) === String(authUser?._id) && (
              <div className="mx-3 mb-3 rounded-xl bg-white/10 p-3">
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
                  {currentIndex + 1} / {activeStatuses.length}
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
    </section>
  );
};

export default StatusSection;
