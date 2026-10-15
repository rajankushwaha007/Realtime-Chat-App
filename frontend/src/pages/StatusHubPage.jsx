import { useEffect, useMemo, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
    const navigate = useNavigate();
    const [editorOpen, setEditorOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previewIndex, setPreviewIndex] = useState(0);

    const previewFile = selectedFiles[previewIndex];

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
        event.target.value = "";
    };


    useEffect(() => {
        try {
            localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds));
        } catch {
            toast.error("Unable to save statuses in this browser.");
        }
    }, [savedIds]);

    const visibleStatuses = useMemo(() => {
        const query = search.trim().toLowerCase();

        return STATUS_ITEMS.filter((item) => {
            const matchesTab =
                activeTab !== "saved" || savedIds.includes(item.id);

            const matchesCategory =
                category === "all" || item.type === category;

            const matchesSearch =
                !query ||
                [item.title, item.text, item.category, item.type]
                    .filter(Boolean)
                    .some((value) => value.toLowerCase().includes(query));

            return matchesTab && matchesCategory && matchesSearch;
        });
    }, [activeTab, category, savedIds, search]);

    const toggleSaved = (item) => {
        const alreadySaved = savedIds.includes(item.id);

        setSavedIds((current) =>
            alreadySaved
                ? current.filter((id) => id !== item.id)
                : [...current, item.id]
        );

        toast.success(
            alreadySaved ? "Removed from saved statuses" : "Status saved!"
        );
    };
    const shareToStatus = (item) => {
        if (item.type !== "text") {
            toast.error(
                "Photo/video sharing needs the upload flow. Cloudinary upload is currently failing."
            );
            return;
        }

        navigate("/status", {
            state: {
                statusDraft: {
                    type: "text",
                    text: item.text,
                    title: item.title,
                },
            },
        });
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

                    </div>

                    {activeTab === "online" ? (
                        <section className="rounded-2xl border border-base-300 p-8 text-center">
                            <Globe className="mx-auto mb-3 h-10 w-10 opacity-60" />
                            <h2 className="text-xl font-bold">Online Status Gallery</h2>
                            <p className="mx-auto mt-2 max-w-lg text-sm opacity-70">
                                Online search will be connected to a real media provider in
                                the next step. This gallery currently uses built-in examples
                                and does not display fake online search results.
                            </p>
                        </section>
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
        </main>
    );
};

export default StatusHubPage;