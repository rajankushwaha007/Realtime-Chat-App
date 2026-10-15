import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useStatusStore = create((set, get) => ({
  statuses: [],
  isLoading: false,
  isCreating: false,

  fetchStatuses: async (showLoader = true) => {
    if (showLoader) set({ isLoading: true });

    try {
      const res = await axiosInstance.get("/statuses");
      set({ statuses: res.data });
    } catch (error) {
      console.error("Fetch statuses error:", error);
      if (showLoader) {
        toast.error(
          error.response?.data?.message || "Failed to load statuses"
        );
      }
    } finally {
      if (showLoader) set({ isLoading: false });
    }
  },

  createTextStatus: async (text) => {
    if (!text.trim()) {
      toast.error("Please enter a status");
      return false;
    }

    set({ isCreating: true });

    try {
      await axiosInstance.post("/statuses", {
        type: "text",
        text: text.trim(),
      });

      await get().fetchStatuses(false);
      toast.success("Status added successfully");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add status"
      );
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  createImageStatus: async (image) => {
    set({ isCreating: true });

    try {
      await axiosInstance.post("/statuses", {
        type: "image",
        image,
      });

      await get().fetchStatuses(false);
      toast.success("Photo status added successfully");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to upload status"
      );
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  createVideoStatus: async (video) => {
    set({ isCreating: true });

    try {
      await axiosInstance.post("/statuses", {
        type: "video",
        video,
      });

      await get().fetchStatuses(false);
      toast.success("Video status added successfully");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to upload video status"
      );
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  markStatusViewed: async (statusId) => {
    try {
      await axiosInstance.post(`/statuses/${statusId}/view`);
      await get().fetchStatuses(false);
    } catch (error) {
      console.error("Mark status viewed error:", error);
    }
  },

  toggleStatusLike: async (statusId) => {
    try {
      const res = await axiosInstance.post(
        `/statuses/${statusId}/react`,
        { emoji: "❤️" }
      );

      await get().fetchStatuses(false);
      return res.data.liked;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update status like"
      );
      return false;
    }
  },

  deleteStatus: async (statusId) => {
    try {
      await axiosInstance.delete(`/statuses/${statusId}`);
      await get().fetchStatuses(false);
      toast.success("Status deleted");
      return true;
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete status"
      );
      return false;
    }
  },
}));