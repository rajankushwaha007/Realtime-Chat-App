import PageBackButton from "../components/PageBackButton";
import { useCallback, useEffect, useState } from "react";
import {
    Phone,
    Video,
    Clock,
    Trash2,
    RefreshCw,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
} from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useCallStore } from "../store/useCallStore";

const formatDate = (date) => {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDuration = (seconds = 0) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    return minutes > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`;
};

const getCallStatus = (call, isOutgoing) => {
    if (call.status === "missed" || call.status === "no_answer") {
        return isOutgoing ? "No answer" : "Missed call";
    }

    if (call.status === "rejected") {
        return isOutgoing ? "Call declined" : "You declined";
    }

    if (call.status === "ringing") {
        return "Unanswered";
    }

    return "Completed";
};

const CallsPage = () => {
    const authUser = useAuthStore((state) => state.authUser);
    const startCall = useCallStore((state) => state.startCall);
    const callStatus = useCallStore((state) => state.callStatus);

    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    const fetchCalls = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axiosInstance.get("/calls");
            setCalls(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Fetch call history error:", err);
            setError(
                err.response?.data?.message ||
                "Call history load nahi hui. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalls();
    }, [fetchCalls]);

    const deleteCall = async (callId) => {
        if (!callId || deletingId) return;

        try {
            setDeletingId(callId);
            await axiosInstance.delete(`/calls/${callId}`);

            setCalls((currentCalls) =>
                currentCalls.filter((call) => call._id !== callId)
            );
        } catch (err) {
            console.error("Delete call history error:", err);
            setError(
                err.response?.data?.message || "Call history delete nahi hui."
            );
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-base-200 p-4 md:p-6">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <PageBackButton fallback="/" />

                        <div>
                            <h1 className="text-xl font-bold">Calls</h1>
                            <p className="mt-1 text-sm opacity-60">
                                Your audio and video call history
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={fetchCalls}
                        disabled={loading}
                        className="btn btn-ghost btn-circle btn-sm"
                        title="Refresh call history"
                        aria-label="Refresh call history"
                    >
                        <RefreshCw
                            size={18}
                            className={loading ? "animate-spin" : ""}
                        />
                    </button>
                </div>


                {error && (
                    <div className="m-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={fetchCalls}
                            className="btn btn-ghost btn-sm mt-2"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-16">
                        <span className="loading loading-spinner loading-lg text-primary" />
                        <p className="text-sm opacity-60">Loading call history...</p>
                    </div>
                ) : calls.length === 0 ? (
                    <div className="flex flex-col items-center px-6 py-16 text-center">
                        <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-primary/10">
                            <Phone size={36} className="text-primary" />
                        </div>

                        <h2 className="text-lg font-semibold">No call history yet</h2>

                        <p className="mt-2 max-w-sm text-sm opacity-60">
                            Calls will appear here after call records have been saved.
                            Try making an audio or video call first.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-base-300">
                        {calls.map((call) => {
                            const callerId =
                                typeof call.callerId === "object"
                                    ? call.callerId?._id
                                    : call.callerId;

                            const receiverId =
                                typeof call.receiverId === "object"
                                    ? call.receiverId?._id
                                    : call.receiverId;

                            const isOutgoing =
                                String(callerId) === String(authUser?._id);

                            const otherUser = isOutgoing
                                ? call.receiverId
                                : call.callerId;

                            const name =
                                typeof otherUser === "object"
                                    ? otherUser?.fullName
                                    : null;

                            const profilePic =
                                typeof otherUser === "object"
                                    ? otherUser?.profilePic
                                    : null;

                            const missed =
                                call.status === "missed" ||
                                call.status === "no_answer";

                            return (
                                <div
                                    key={call._id || call.callId}
                                    className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-base-200/60 md:px-5"
                                >
                                    <img
                                        src={profilePic || "/avatar.png"}
                                        alt=""
                                        className="size-12 shrink-0 rounded-full border border-base-300 object-cover"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={`truncate font-semibold ${missed && !isOutgoing ? "text-error" : ""
                                                }`}
                                        >
                                            {name || "Chat user"}
                                        </p>

                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-70">
                                            {missed && !isOutgoing ? (
                                                <PhoneMissed size={14} className="text-error" />
                                            ) : isOutgoing ? (
                                                <PhoneOutgoing size={14} />
                                            ) : (
                                                <PhoneIncoming size={14} />
                                            )}

                                            <span>{getCallStatus(call, isOutgoing)}</span>
                                            <span>·</span>
                                            {call.callType === "video" ? (
                                                <Video size={14} />
                                            ) : (
                                                <Phone size={14} />
                                            )}
                                            <span>
                                                {call.callType === "video" ? "Video" : "Audio"}
                                            </span>
                                        </div>

                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs opacity-60">
                                            <Clock size={12} />
                                            <span>{formatDate(call.startedAt)}</span>
                                            {call.status === "completed" && (
                                                <>
                                                    <span>·</span>
                                                    <span>{formatDuration(call.durationSeconds)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => startCall(otherUser, "audio")}
                                            disabled={callStatus !== "idle" || !otherUser?._id}
                                            className="btn btn-ghost btn-circle btn-sm text-success"
                                            title="Audio call"
                                            aria-label={`Audio call ${name}`}
                                        >
                                            <Phone size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => startCall(otherUser, "video")}
                                            disabled={callStatus !== "idle" || !otherUser?._id}
                                            className="btn btn-ghost btn-circle btn-sm text-success"
                                            title="Video call"
                                            aria-label={`Video call ${name}`}
                                        >
                                            <Video size={18} />
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => deleteCall(call._id)}
                                        disabled={deletingId === call._id || !call._id}
                                        className="btn btn-ghost btn-circle btn-sm text-error"
                                        title="Delete from your call history"
                                        aria-label="Delete call from history"
                                    >
                                        {deletingId === call._id ? (
                                            <span className="loading loading-spinner loading-sm" />
                                        ) : (
                                            <Trash2 size={17} />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
};

export default CallsPage;