
import { useEffect, useMemo, useState } from "react";
import PageBackButton from "../components/PageBackButton";
import {
    FileText,
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Save,
    StickyNote,
    Loader2,
    Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const NotesPage = () => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [showEditor, setShowEditor] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const fetchNotes = async () => {
        try {
            const res = await axiosInstance.get("/notes");
            setNotes(res.data);
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to load notes"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, []);

    const filteredNotes = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return notes;

        return notes.filter(
            (note) =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query)
        );
    }, [notes, search]);

    const openCreateEditor = () => {
        setEditingId(null);
        setTitle("");
        setContent("");
        setShowEditor(true);
    };

    const openEditEditor = (note) => {
        setEditingId(note._id);
        setTitle(note.title);
        setContent(note.content);
        setShowEditor(true);
    };

    const closeEditor = () => {
        setShowEditor(false);
        setEditingId(null);
        setTitle("");
        setContent("");
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!title.trim()) {
            toast.error("Please enter a note title");
            return;
        }

        setSaving(true);

        try {
            if (editingId) {
                const res = await axiosInstance.put(`/notes/${editingId}`, {
                    title: title.trim(),
                    content,
                });

                setNotes((prev) =>
                    prev.map((note) =>
                        note._id === editingId ? res.data : note
                    ).sort(
                        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
                    )
                );

                toast.success("Note updated successfully");
            } else {
                const res = await axiosInstance.post("/notes", {
                    title: title.trim(),
                    content,
                });

                setNotes((prev) => [res.data, ...prev]);
                toast.success("Note created successfully");
            }

            closeEditor();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to save note"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (note) => {
        const confirmed = window.confirm(
            `Delete "${note.title}"? This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            await axiosInstance.delete(`/notes/${note._id}`);

            setNotes((prev) =>
                prev.filter((item) => item._id !== note._id)
            );

            toast.success("Note deleted successfully");
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to delete note"
            );
        }
    };

    const formatDate = (date) =>
        new Date(date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    return (
        <div className="min-h-screen bg-base-200 pt-20 px-4 pb-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        
                        <div className="flex items-center gap-3 mb-2">
                            <PageBackButton fallback="/" />

                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <StickyNote className="size-7" />
                            </div>

                            <h1 className="text-3xl font-bold">My Notes</h1>
                        </div>

                        <p className="text-base-content/60">
                            Your personal space for ideas, tasks and reminders.
                        </p>
                    </div>

                    <button
                        onClick={openCreateEditor}
                        className="btn btn-primary gap-2"
                    >
                        <Plus className="size-5" />
                        Create Note
                    </button>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-base-content/50" />

                    <input
                        type="text"
                        placeholder="Search your notes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input input-bordered w-full pl-12 bg-base-100"
                    />
                </div>

                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">All Notes</h2>
                    <span className="text-sm text-base-content/60">
                        {filteredNotes.length} notes
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div className="bg-base-100 rounded-2xl border border-base-300 p-12 text-center">
                        <FileText className="size-14 mx-auto mb-4 text-base-content/30" />

                        <h3 className="text-xl font-semibold mb-2">
                            {search ? "No matching notes" : "No notes yet"}
                        </h3>

                        <p className="text-base-content/60 mb-5">
                            {search
                                ? "Try a different search term."
                                : "Create your first note and keep your ideas in one place."}
                        </p>

                        {!search && (
                            <button
                                onClick={openCreateEditor}
                                className="btn btn-primary btn-sm"
                            >
                                <Plus className="size-4" />
                                Create your first note
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredNotes.map((note) => (
                            <article
                                key={note._id}
                                className="bg-base-100 border border-base-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-52"
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <h3 className="font-bold text-lg break-words whitespace-pre-wrap">
                                        {note.title}
                                    </h3>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => openEditEditor(note)}
                                            className="btn btn-ghost btn-sm btn-square"
                                            title="Edit note"
                                            aria-label="Edit note"
                                        >
                                            <Pencil className="size-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDelete(note)}
                                            className="btn btn-ghost btn-sm btn-square text-error"
                                            title="Delete note"
                                            aria-label="Delete note"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-base-content/70 whitespace-pre-wrap break-words flex-1">
                                    {note.content || "No content added."}
                                </p>

                                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-base-300 text-xs text-base-content/50">
                                    <Clock className="size-3.5" />
                                    Updated {formatDate(note.updatedAt)}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {showEditor && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="font-bold text-xl">
                                {editingId ? "Edit Note" : "Create Note"}
                            </h3>

                            <button
                                type="button"
                                onClick={closeEditor}
                                className="btn btn-ghost btn-sm btn-square"
                                aria-label="Close editor"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <label className="label">
                                <span className="label-text font-medium">Note title</span>
                            </label>

                            <input
                                type="text"
                                placeholder="e.g. My daily tasks"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={150}
                                required
                                className="input input-bordered w-full mb-4"
                            />

                            <label className="label">
                                <span className="label-text font-medium">Your notes</span>
                            </label>

                            <textarea
                                placeholder="Write anything you want..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                maxLength={50000}
                                rows={9}
                                className="textarea textarea-bordered w-full resize-y"
                            />

                            <div className="text-xs text-base-content/50 mt-1">
                                {content.length}/50000 characters
                            </div>

                            <div className="modal-action">
                                <button
                                    type="button"
                                    onClick={closeEditor}
                                    className="btn btn-ghost"
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary gap-2"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Save className="size-4" />
                                    )}

                                    {saving
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Note"
                                            : "Save Note"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <button
                        type="button"
                        className="modal-backdrop"
                        onClick={closeEditor}
                        aria-label="Close modal"
                    />
                </div>
            )}
        </div>
    );
};

export default NotesPage;
