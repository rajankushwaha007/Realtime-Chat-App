import { useEffect, useMemo, useRef, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useStatusStore } from "../store/useStatusStore";

import {
    Search,
    Image as ImageIcon,
    Video,
    Type,
    Bookmark,
    Globe,
    Download,
    Copy,
    Check,
    Heart,
    Upload,
} from "lucide-react";

const STATUS_ITEMS = [
    {
        id: "text-1",
        type: "text",
        title: "Positive Vibes",
        text: "Every day is a fresh start. Make it count. ✨",
        category: "Motivation",
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        color: "#ffffff",
    },
    {
        id: "text-2",
        type: "text",
        title: "Life Quote",
        text: "Enjoy the little things in life. ❤️",
        category: "Life",
        background: "linear-gradient(135deg, #f093fb, #f5576c)",
        color: "#ffffff",
    },
    {
        id: "text-3",
        type: "text",
        title: "Success",
        text: "Dream big. Work hard. Stay focused. 🚀",
        category: "Motivation",
        background: "linear-gradient(135deg, #11998e, #38ef7d)",
        color: "#ffffff",
    },
    {
        id: "text-4",
        type: "text",
        title: "Friendship",
        text: "Good friends make good times better. 🫶",
        category: "Friends",
        background: "linear-gradient(135deg, #fc4a1a, #f7b733)",
        color: "#ffffff",
    },
    {
        id: "text-5",
        type: "text",
        title: "Attitude",
        text: "Be yourself. Everyone else is already taken. 😎",
        category: "Attitude",
        background: "linear-gradient(135deg, #232526, #414345)",
        color: "#ffffff",
    },
    {
        id: "image-1",
        type: "image",
        title: "Mountain View",
        category: "Nature",
        mediaUrl:
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85",
    },
    {
        id: "image-2",
        type: "image",
        title: "Sunset Vibes",
        category: "Nature",
        mediaUrl:
            "https://images.unsplash.com/photo-1472120435266-53107fd0c44a?auto=format&fit=crop&w=900&q=85",
    },
    {
        id: "image-3",
        type: "image",
        title: "City Lights",
        category: "Lifestyle",
        mediaUrl:
            "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
    },
    {
        id: "video-1",
        type: "video",
        title: "Nature Video",
        category: "Nature",
        mediaUrl:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    },
];

const CATEGORIES = [
    { id: "all", label: "All" },
    { id: "text", label: "Text", icon: Type },
    { id: "image", label: "Images", icon: ImageIcon },
    { id: "video", label: "Videos", icon: Video },
];

const SAVED_KEY = "chatty-status-hub-saved-v1";

const readSavedStatuses = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const StatusHubPage = () => {
    const [activeTab, setActiveTab] = useState("built-in");
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [savedIds, setSavedIds] = useState(readSavedStatuses);

    const [onlineResults, setOnlineResults] = useState([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState("");
    const [savedOnlineItems, setSavedOnlineItems] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem("chatty-status-hub-online-saved-v1") || "[]"
            );
        } catch {
            return [];
        }
    });

    const navigate = useNavigate();
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    const { createImageStatus, createVideoStatus, isCreating } =
        useStatusStore();

    const [filter, setFilter] = useState("none");
    const [overlayText, setOverlayText] = useState("");
    const [overlayEmoji, setOverlayEmoji] = useState("");
    const [rotation, setRotation] = useState(0);
    const [audioFile, setAudioFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState("");
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [drawingMode, setDrawingMode] = useState(false);
    const audioInputRef = useRef(null);

    const previewFile = selectedFiles[previewIndex];
    const filterStyles = {
        none: "none",
        grayscale: "grayscale(1)",
        sepia: "sepia(0.85)",
        warm: "saturate(1.4) sepia(0.2)",
        bright: "brightness(1.2)",
        contrast: "contrast(1.25)",
    };

    const previewUrl = useMemo(() => {
        if (!previewFile) return "";
        return URL.createObjectURL(previewFile);
    }, [previewFile]);

    useEffect(() => {
        if (!previewUrl) return;

        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);



    const handleChoosePhotos = (event) => {
        const files = Array.from(event.target.files || []);
        const validFiles = files.filter(
            (file) =>
                file.type.startsWith("image/") ||
                file.type.startsWith("video/")
        );

        if (validFiles.length === 0) {
            toast.error("Please choose an image or video.");
            return;
        }

        setSelectedFiles((current) => [...current, ...validFiles]);
        setPreviewIndex(0);
        setEditorOpen(true);
    };


    const handleChooseMusic = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("audio/")) {
            toast.error("Please select an audio file.");
            return;
        }

        if (audioUrl) URL.revokeObjectURL(audioUrl);

        const url = URL.createObjectURL(file);
        setAudioFile(file);
        setAudioUrl(url);
        toast.success("Music ready to preview");
    };

    useEffect(() => {
        try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds));
        } catch {
            toast.error("Unable to save statuses in this browser.");
        }
    }, [savedIds]);

    useEffect(() => {
        try {
            localStorage.setItem(
                "chatty-status-hub-online-saved-v1",
                JSON.stringify(savedOnlineItems)
            );
        } catch {
            toast.error("Unable to save online statuses in this browser.");
        }
    }, [savedOnlineItems]);

    useEffect(() => {
        if (activeTab !== "online") return;

        const query = search.trim();

        if (query.length < 2) {
            setOnlineResults([]);
            setOnlineError("");
            setOnlineLoading(false);
            return;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            setOnlineLoading(true);
            setOnlineError("");

            try {
                const params = new URLSearchParams({
                    q: query,
                    page_size: "20",
                    filter_dead: "true",
                    mature: "false",
                });

                const response = await fetch(
                    `https://api.openverse.org/v1/images/?${params}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    throw new Error(
                        response.status === 429
                            ? "Search limit reached. Please wait a little and try again."
                            : `Openverse search failed (${response.status}).`
                    );
                }

                const data = await response.json();

                console.log("Openverse API status:", response.status);
                console.log("Openverse response:", data);
                console.log("Openverse results:", data.results?.length);

                const items = (data.results || [])
                    .filter((image) => image.url && image.thumbnail)
                    .map((image) => ({
                        id: `openverse-${image.id}`,
                        type: "image",
                        title: image.title || "Untitled image",
                        category: image.category || "Online",
                        mediaUrl: image.url,
                        thumbnail: image.thumbnail,
                        creator: image.creator || "Unknown creator",
                        creatorUrl: image.creator_url || "",
                        license: image.license || "License not specified",
                        licenseVersion: image.license_version || "",
                        licenseUrl: image.license_url || "",
                        sourceUrl: image.foreign_landing_url || "",
                        attribution: image.attribution || "",
                    }));

                setOnlineResults(items);

                if (items.length === 0) {
                    setOnlineError("No images found. Try another search.");
                }
            } catch (error) {
                if (error.name === "AbortError") return;

                console.error("Openverse search error:", error);
                setOnlineResults([]);
                setOnlineError(
                    error.message || "Unable to search images. Please try again."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setOnlineLoading(false);
                }
            }
        }, 500);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [activeTab, search]);


    const visibleStatuses = useMemo(() => {
        const query = search.trim().toLowerCase();

        let sourceItems;

        if (activeTab === "online") {
            sourceItems = onlineResults;
        } else if (activeTab === "saved") {
            sourceItems = [...STATUS_ITEMS, ...savedOnlineItems];
        } else {
            sourceItems = STATUS_ITEMS;
        }

        return sourceItems.filter((item) => {
            const matchesTab =
                activeTab !== "saved" || savedIds.includes(item.id);

            const matchesCategory =
                category === "all" || item.type === category;

            const matchesSearch =
                !query ||
                [item.title, item.text, item.category, item.type]
                    .filter(Boolean)
                    .some((value) =>
                        value.toLowerCase().includes(query)
                    );

            return matchesTab && matchesCategory && matchesSearch;
        });
    }, [
        activeTab,
        category,
        onlineResults,
        savedIds,
        savedOnlineItems,
        search,
    ]);



    const shareToStatus = async (item) => {
        if (item.type === "text") {
            navigate("/status", {
                state: {
                    statusDraft: {
                        type: "text",
                        text: item.text,
                        title: item.title,
                    },
                },
            });
            return;
        }

        if (item.type === "image" && item.id.startsWith("openverse-")) {
            try {
                toast.loading("Preparing image...", {
                    id: "prepare-status",
                });

                const response = await fetch(item.mediaUrl);

                if (!response.ok) {
                    throw new Error("Unable to fetch this image.");
                }

                const blob = await response.blob();

                if (!blob.type.startsWith("image/")) {
                    throw new Error("The source did not return a valid image.");
                }

                const file = new File(
                    [blob],
                    "online-status-image.jpg",
                    { type: blob.type }
                );

                setSelectedFiles([file]);
                setPreviewIndex(0);
                setFilter("none");
                setOverlayText("");
                setOverlayEmoji("");
                setRotation(0);
                setEditorOpen(true);

                toast.success("Image ready to edit!", {
                    id: "prepare-status",
                });
            } catch (error) {
                console.error("Online image share error:", error);

                toast.error(
                    "Could not load this image. Try opening its original source.",
                    { id: "prepare-status" }
                );
            }

            return;
        }

        toast.error(
            "Use Choose Photos to share this image or video."
        );
    };


    const handleShareSelected = async () => {
        const file = selectedFiles[previewIndex];

        if (!file) {
            toast.error("Please select an image or video first.");
            return;
        }

        try {
            let mediaData;

            if (file.type.startsWith("image/")) {
                const image = new Image();
                image.src = previewUrl;

                await new Promise((resolve, reject) => {
                    image.onload = resolve;
                    image.onerror = reject;
                });

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                const isRotated = Math.abs(rotation % 180) === 90;

                canvas.width = isRotated ? image.height : image.width;
                canvas.height = isRotated ? image.width : image.height;

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.filter = filterStyles[filter] || "none";

                ctx.drawImage(
                    image,
                    -image.width / 2,
                    -image.height / 2
                );

                ctx.filter = "none";

                if (overlayEmoji) {
                    ctx.font = `${Math.max(40, canvas.width * 0.12)}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(
                        overlayEmoji,
                        0,
                        overlayText ? canvas.height * 0.25 : 0
                    );
                }

                if (overlayText.trim()) {
                    const fontSize = Math.max(24, canvas.width * 0.055);
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";

                    const lines = overlayText.split("\n");
                    const lineHeight = fontSize * 1.3;
                    const startY =
                        canvas.height / 2 -
                        ((lines.length - 1) * lineHeight) / 2;

                    lines.forEach((line, index) => {
                        const y = startY + index * lineHeight;
                        ctx.lineWidth = Math.max(3, fontSize * 0.12);
                        ctx.strokeStyle = "rgba(0,0,0,0.7)";
                        ctx.strokeText(line, 0, y);
                        ctx.fillStyle = "#ffffff";
                        ctx.fillText(line, 0, y);
                    });
                }

                mediaData = canvas.toDataURL("image/jpeg", 0.92);

                const success = await createImageStatus(mediaData);

                if (!success) return;
            } else if (file.type.startsWith("video/")) {
                const reader = new FileReader();

                mediaData = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const success = await createVideoStatus(mediaData);

                if (!success) return;
            } else {
                toast.error("Unsupported media type.");
                return;
            }

            setEditorOpen(false);
            setSelectedFiles([]);
            setPreviewIndex(0);
            setFilter("none");
            setOverlayEmoji("");
            setOverlayText("");
            setRotation(0);
            setAudioFile(null);
            setAudioUrl("");
            setShowMusicPicker(false);

        } catch (error) {
            console.error("Status editor upload error:", error);
            toast.error("Unable to prepare media. Please try another file.");
        }
    };
    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Status text copied!");
        } catch {
            toast.error("Clipboard access unavailable in this browser.");
        }
    };

    const downloadMedia = async (item) => {
        if (item.type === "text") {
            await copyText(item.text);
            return;
        }

        try {
            const response = await fetch(item.mediaUrl);

            if (!response.ok) {
                throw new Error("Download failed");
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = blobUrl;
            link.download = `${item.id}.${item.type === "video" ? "mp4" : "jpg"}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);

            toast.success("Download started!");
        } catch {
            window.open(item.mediaUrl, "_blank", "noopener,noreferrer");
            toast("Opened media in a new tab. Use its download option.");
        }
    };

    useEffect(() => {
        return () => {
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);


    return (
        <main className="min-h-screen bg-base-200 px-4 pb-10 pt-20 md:px-6">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
                <header className="flex items-center gap-3 border-b border-base-300 p-5">
                    <PageBackButton fallback="/" />

                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold">Status Hub</h1>
                        <p className="mt-1 text-sm opacity-60">
                            Discover, save and download your favourite status ideas.
                        </p>
                    </div>
                </header>

                <div className="space-y-5 p-4 md:p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 opacity-50" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search quotes, nature, motivation..."
                            className="input input-bordered w-full pl-10"
                            aria-label="Search statuses"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: "built-in", label: "Built-in Gallery", icon: ImageIcon },
                            { id: "online", label: "Online Gallery", icon: Globe },
                            { id: "saved", label: "Saved Statuses", icon: Bookmark },
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTab(id)}
                                className={`btn btn-sm gap-2 ${activeTab === id ? "btn-primary" : "btn-outline"
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                                {id === "saved" && savedIds.length > 0 && (
                                    <span className="badge badge-sm">{savedIds.length}</span>
                                )}
                            </button>
                        ))}

                        <label className="btn btn-sm btn-primary gap-2 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Choose Photos
                            <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={handleChoosePhotos}
                            />
                        </label>

                        {audioUrl && (
                            <div className="mt-3 w-full rounded-xl border border-base-300 p-3">
                                <p className="mb-2 text-sm font-medium">
                                    Selected: {audioFile?.name}
                                </p>
                                <audio
                                    src={audioUrl}
                                    controls
                                    className="w-full"
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm mt-2"
                                    onClick={() => {
                                        setAudioFile(null);
                                        setAudioUrl("");
                                    }}
                                >
                                    Remove music
                                </button>
                            </div>
                        )}


                    </div>


                    {activeTab === "online" ? (
                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                {CATEGORIES.filter((item) => item.id !== "text").map(
                                    ({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setCategory(id)}
                                            className={`btn btn-xs sm:btn-sm ${category === id ? "btn-primary" : "btn-ghost"
                                                }`}
                                        >
                                            {Icon && <Icon className="h-4 w-4" />}
                                            {label}
                                        </button>
                                    )
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-bold">Online Images</h2>
                                <span className="text-sm opacity-60">
                                    {visibleStatuses.length} results
                                </span>
                            </div>

                            {search.trim().length < 2 ? (
                                <div className="rounded-xl border border-dashed border-base-300 p-10 text-center">
                                    <Globe className="mx-auto mb-3 h-8 w-8 opacity-50" />
                                    <p className="font-semibold">Search online images</p>
                                    <p className="mt-1 text-sm opacity-60">
                                        Enter at least 2 characters, such as love, sad,
                                        happy or motivation.
                                    </p>
                                </div>
                            ) : onlineLoading ? (
                                <div className="flex justify-center p-12">
                                    <span className="loading loading-spinner loading-lg" />
                                </div>
                            ) : onlineError ? (
                                <div className="rounded-xl border border-dashed border-base-300 p-10 text-center">
                                    <p>{onlineError}</p>
                                </div>
                            ) : visibleStatuses.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-base-300 p-10 text-center">
                                    No matching images found.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {visibleStatuses.map((item) => (
                                        <article
                                            key={item.id}
                                            className="overflow-hidden rounded-2xl border border-base-300 bg-base-100"
                                        >
                                            <div className="relative h-72 bg-base-200">
                                                <img
                                                    src={item.thumbnail || item.mediaUrl}
                                                    alt={item.title}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={() => toggleSaved(item)}
                                                    aria-label="Save image"
                                                    className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"
                                                >
                                                    {savedIds.includes(item.id) ? (
                                                        <Heart className="h-5 w-5 fill-current text-pink-400" />
                                                    ) : (
                                                        <Bookmark className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="space-y-3 p-4">
                                                <h3 className="font-bold">
                                                    {item.title}
                                                </h3>

                                                <p className="text-xs opacity-70">
                                                    Creator: {item.creator}
                                                </p>

                                                <p className="text-xs opacity-70">
                                                    License: {item.license}
                                                    {item.licenseVersion
                                                        ? ` ${item.licenseVersion}`
                                                        : ""}
                                                </p>

                                                {item.sourceUrl && (
                                                    <a
                                                        href={item.sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="link link-primary text-sm"
                                                    >
                                                        View original source
                                                    </a>
                                                )}

                                                {item.licenseUrl && (
                                                    <a
                                                        href={item.licenseUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="link link-primary ml-3 text-sm"
                                                    >
                                                        View license
                                                    </a>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => downloadMedia(item)}
                                                    className="btn btn-primary btn-sm w-full gap-2"
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Download
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => shareToStatus(item)}
                                                    className="btn btn-outline btn-sm w-full gap-2"
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Share to Status
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (

                        <>
                            <div className="flex flex-wrap items-center gap-2">
                                {CATEGORIES.map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setCategory(id)}
                                        className={`btn btn-xs sm:btn-sm ${category === id ? "btn-primary" : "btn-ghost"
                                            }`}
                                    >
                                        {Icon && <Icon className="h-4 w-4" />}
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-bold">
                                    {activeTab === "saved"
                                        ? "Your Saved Statuses"
                                        : "Explore Statuses"}
                                </h2>
                                <span className="text-sm opacity-60">
                                    {visibleStatuses.length} results
                                </span>
                            </div>

                            {visibleStatuses.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-base-300 px-5 py-12 text-center">
                                    <Bookmark className="mx-auto mb-3 h-8 w-8 opacity-50" />
                                    <h3 className="font-semibold">No statuses found</h3>
                                    <p className="mt-1 text-sm opacity-60">
                                        Try another search or save a status to see it here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                    {visibleStatuses.map((item) => (
                                        <article
                                            key={item.id}
                                            className="overflow-hidden rounded-2xl border border-base-300 bg-base-100"
                                        >
                                            <div className="relative flex h-72 items-center justify-center overflow-hidden bg-base-200">
                                                {item.type === "text" ? (
                                                    <div
                                                        className="flex h-full w-full items-center justify-center p-7 text-center"
                                                        style={{
                                                            background: item.background,
                                                            color: item.color,
                                                        }}
                                                    >
                                                        <p className="text-2xl font-bold leading-relaxed">
                                                            {item.text}
                                                        </p>
                                                    </div>
                                                ) : item.type === "image" ? (
                                                    <img
                                                        src={item.mediaUrl}
                                                        alt={item.title}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <video
                                                        src={item.mediaUrl}
                                                        controls
                                                        playsInline
                                                        preload="metadata"
                                                        className="h-full w-full object-cover"
                                                    />
                                                )}

                                                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                                                    {item.type.toUpperCase()}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleSaved(item)}
                                                    aria-label={
                                                        savedIds.includes(item.id)
                                                            ? "Remove saved status"
                                                            : "Save status"
                                                    }
                                                    className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                                                >
                                                    {savedIds.includes(item.id) ? (
                                                        <Heart className="h-5 w-5 fill-current text-pink-400" />
                                                    ) : (
                                                        <Bookmark className="h-5 w-5" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="space-y-3 p-4">
                                                <div>
                                                    <h3 className="font-bold">{item.title}</h3>
                                                    <p className="mt-1 text-sm opacity-60">
                                                        {item.category}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => downloadMedia(item)}
                                                    className="btn btn-primary btn-sm w-full gap-2"
                                                >
                                                    {item.type === "text" ? (
                                                        <Copy className="h-4 w-4" />
                                                    ) : (
                                                        <Download className="h-4 w-4" />
                                                    )}
                                                    {item.type === "text" ? "Copy Status" : "Download"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => shareToStatus(item)}
                                                    className="btn btn-primary btn-sm w-full gap-2"
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Share to Status
                                                </button>

                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {editorOpen && previewFile && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/90 p-3 sm:p-6">
                    <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-base-100 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-base-300 p-4">
                            <div>
                                <h2 className="text-lg font-bold">
                                    Edit your status
                                </h2>
                                <p className="text-xs opacity-60">
                                    {previewFile.name}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="btn btn-circle btn-ghost btn-sm"
                                onClick={() => setEditorOpen(false)}
                                aria-label="Close editor"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid gap-5 p-4 md:grid-cols-[1fr_220px]">
                            {/* Media preview */}
                            <div className="relative flex min-h-[350px] items-center justify-center overflow-hidden rounded-xl bg-black">
                                {previewFile.type.startsWith("image/") ? (
                                    <img
                                        src={previewUrl}
                                        alt="Status preview"
                                        className="max-h-[65vh] w-full object-contain"
                                        style={{
                                            filter: filterStyles[filter] || "none",
                                            transform: `rotate(${rotation}deg)`,
                                        }}
                                    />
                                ) : (
                                    <video
                                        key={previewUrl}
                                        src={previewUrl}
                                        controls
                                        playsInline
                                        className="max-h-[65vh] w-full object-contain"
                                        style={{
                                            filter: filterStyles[filter] || "none",
                                        }}
                                    />
                                )}

                                {(overlayEmoji || overlayText) && (
                                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                                        {overlayEmoji && (
                                            <span className="text-5xl drop-shadow-lg">
                                                {overlayEmoji}
                                            </span>
                                        )}

                                        {overlayText && (
                                            <p className="whitespace-pre-wrap rounded-lg bg-black/30 px-3 py-2 text-xl font-bold text-white drop-shadow-lg">
                                                {overlayText}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {selectedFiles.length > 1 && (
                                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            className="btn btn-circle btn-sm"
                                            disabled={previewIndex === 0}
                                            onClick={() => setPreviewIndex((i) => i - 1)}
                                        >
                                            ‹
                                        </button>

                                        <span className="rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                                            {previewIndex + 1} / {selectedFiles.length}
                                        </span>

                                        <button
                                            type="button"
                                            className="btn btn-circle btn-sm"
                                            disabled={previewIndex === selectedFiles.length - 1}
                                            onClick={() => setPreviewIndex((i) => i + 1)}
                                        >
                                            ›
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Editing tools */}
                            <div className="space-y-5">
                                <section>
                                    <h3 className="mb-2 font-semibold">🎨 Filters</h3>

                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            ["none", "Original"],
                                            ["grayscale", "B&W"],
                                            ["sepia", "Sepia"],
                                            ["warm", "Warm"],
                                            ["bright", "Bright"],
                                            ["contrast", "Contrast"],
                                        ].map(([value, label]) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFilter(value)}
                                                className={`btn btn-xs ${filter === value
                                                    ? "btn-primary"
                                                    : "btn-outline"
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="mb-2 font-semibold">😊 Add emoji</h3>

                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            "❤️", "😍", "😂", "🔥",
                                            "✨", "🥰", "🎉", "😎",
                                            "💯", "🌸", "🙌", "🥹",
                                        ].map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() =>
                                                    setOverlayEmoji((current) =>
                                                        current === emoji ? "" : emoji
                                                    )
                                                }
                                                className={`rounded-lg border p-2 text-xl ${overlayEmoji === emoji
                                                    ? "border-primary bg-primary/10"
                                                    : "border-base-300"
                                                    }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <label className="mb-2 block font-semibold">
                                        ✍️ Add text
                                    </label>

                                    <textarea
                                        value={overlayText}
                                        onChange={(event) =>
                                            setOverlayText(event.target.value)
                                        }
                                        maxLength={150}
                                        rows={2}
                                        placeholder="Write something..."
                                        className="textarea textarea-bordered w-full"
                                    />
                                </section>

                                {previewFile.type.startsWith("image/") && (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm w-full"
                                        onClick={() => setRotation((r) => (r + 90) % 360)}
                                    >
                                        ↻ Rotate image
                                    </button>
                                )}

                                <section>
                                    <h3 className="mb-2 font-semibold">🎵 Music</h3>

                                    <input
                                        ref={audioInputRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={handleChooseMusic}
                                    />

                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm w-full"
                                        onClick={() => audioInputRef.current?.click()}
                                    >
                                        {audioFile ? "Change music" : "Choose music"}
                                    </button>

                                    {audioUrl && (
                                        <div className="mt-2">
                                            <p className="mb-1 break-words text-xs opacity-70">
                                                {audioFile?.name}
                                            </p>

                                            <audio
                                                src={audioUrl}
                                                controls
                                                className="w-full"
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs mt-1"
                                                onClick={() => {
                                                    setAudioFile(null);
                                                    setAudioUrl("");
                                                }}
                                            >
                                                Remove music
                                            </button>
                                        </div>
                                    )}

                                    <p className="mt-2 text-xs opacity-60">
                                        Music preview only. It is not mixed into the uploaded video.
                                    </p>
                                </section>
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="flex flex-wrap justify-end gap-2 border-t border-base-300 p-4">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setEditorOpen(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isCreating || !previewFile}
                                onClick={handleShareSelected}
                            >
                                {isCreating ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    "Share Status"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default StatusHubPage;