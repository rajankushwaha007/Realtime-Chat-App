
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import toast from "react-hot-toast";

const createCallId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const useCallStore = create((set, get) => ({
    callStatus: "idle",
    callStartedAt: null,
    callType: "audio",
    callId: null,
    peerUserId: null,
    peerName: "",
    incomingOffer: null,
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,

    peerConnection: null,
    pendingCandidates: [],
    listeningSocket: null,

    createPeerConnection: (peerUserId, callId) => {
        const socket = useAuthStore.getState().socket;

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit("iceCandidate", {
                    toUserId: peerUserId,
                    candidate: event.candidate,
                    callId,
                });
            }
        };

        pc.ontrack = (event) => {
            const [stream] = event.streams;

            if (stream) {
                set({ remoteStream: stream });
            }
        };

pc.onconnectionstatechange = () => {
    if (pc.connectionState === "connected") {
        set((state) => ({
            callStatus: "active",
            callStartedAt: state.callStartedAt || Date.now(),
        }));
    }

    if (
        ["failed", "closed"].includes(pc.connectionState) &&
        get().callStatus !== "idle"
    ) {
        get().cleanupCall();
    }
};

        set({ peerConnection: pc });

        return pc;
    },

    startCall: async (user, callType = "audio") => {
        const { callStatus } = get();
        const socket = useAuthStore.getState().socket;

        if (callStatus !== "idle") {
            toast.error("A call is already in progress");
            return;
        }

        if (!socket?.connected) {
            toast.error("Chat connection is not ready");
            return;
        }

        if (!user?._id) {
            toast.error("Please select a user first");
            return;
        }

        let stream;

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: callType === "video",
            });

            const callId = createCallId();

            set({
                callStatus: "outgoing",
                callType,
                callId,
                peerUserId: String(user._id),
                peerName: user.fullName || "Chat user",
                localStream: stream,
                remoteStream: null,
                incomingOffer: null,
                isMuted: false,
                isCameraOff: false,
                pendingCandidates: [],
            });

            const pc = get().createPeerConnection(
                String(user._id),
                callId
            );

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("callUser", {
                toUserId: String(user._id),
                offer: pc.localDescription,
                callType,
                callId,
            });
        } catch (error) {
            console.error("Start call error:", error);

            stream?.getTracks().forEach((track) => track.stop());

            get().cleanupCall();
            toast.error(
                error.name === "NotAllowedError"
                    ? "Please allow microphone/camera access"
                    : "Unable to start the call"
            );
        }
    },

    acceptCall: async () => {
        const {
            incomingOffer,
            peerUserId,
            callId,
            callType,
            localStream,
        } = get();

        if (!incomingOffer || !peerUserId || !callId) return;

        let stream = localStream;

        try {
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: callType === "video",
                });
            }

            set({
                localStream: stream,
                callStatus: "connecting",
                pendingCandidates: get().pendingCandidates || [],
            });

            const pc = get().createPeerConnection(peerUserId, callId);

            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
            });

            await pc.setRemoteDescription(
                new RTCSessionDescription(incomingOffer)
            );

            const candidates = get().pendingCandidates;

            for (const candidate of candidates) {
                await pc.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            }

            set({ pendingCandidates: [] });

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            useAuthStore.getState().socket?.emit("answerCall", {
                toUserId: peerUserId,
                answer: pc.localDescription,
                callId,
            });
        } catch (error) {
            console.error("Accept call error:", error);
            toast.error("Unable to accept the call");
            get().cleanupCall();
        }
    },

    rejectCall: () => {
        const { peerUserId, callId } = get();

        useAuthStore.getState().socket?.emit("rejectCall", {
            toUserId: peerUserId,
            callId,
        });

        get().cleanupCall();
    },

    endCall: () => {
        const { peerUserId, callId } = get();

        if (peerUserId && callId) {
            useAuthStore.getState().socket?.emit("endCall", {
                toUserId: peerUserId,
                callId,
            });
        }

        get().cleanupCall();
    },

    toggleMute: () => {
        const { localStream, isMuted } = get();

        localStream?.getAudioTracks().forEach((track) => {
            track.enabled = isMuted;
        });

        set({ isMuted: !isMuted });
    },

    toggleCamera: () => {
        const { localStream, isCameraOff } = get();

        localStream?.getVideoTracks().forEach((track) => {
            track.enabled = isCameraOff;
        });

        set({ isCameraOff: !isCameraOff });
    },

    cleanupCall: () => {
        const {
            localStream,
            remoteStream,
            peerConnection,
        } = get();

        peerConnection?.close();

        [localStream, remoteStream].forEach((stream) => {
            stream?.getTracks().forEach((track) => track.stop());
        });

        set({
            callStatus: "idle",
            callType: "audio",
            callId: null,
            peerUserId: null,
            peerName: "",
            incomingOffer: null,
            localStream: null,
            remoteStream: null,
            peerConnection: null,
            pendingCandidates: [],
            isMuted: false,
            isCameraOff: false,
            callStartedAt: null,
        });
    },

    setupCallListeners: (socket) => {
        if (!socket) return;

        const existingSocket = get().listeningSocket;

        if (existingSocket === socket) return;

        if (existingSocket) {
            existingSocket.off("incomingCall");
            existingSocket.off("callAccepted");
            existingSocket.off("iceCandidate");
            existingSocket.off("callRejected");
            existingSocket.off("callEnded");
            existingSocket.off("callUnavailable");
        }

        set({ listeningSocket: socket });

        socket.on("incomingCall", (data) => {
            if (get().callStatus !== "idle") {
                socket.emit("rejectCall", {
                    toUserId: data.fromUserId,
                    callId: data.callId,
                });
                return;
            }

            set({
                callStatus: "incoming",
                callId: data.callId,
                peerUserId: String(data.fromUserId),
                peerName: data.fromName || "Chat user",
                callType: data.callType,
                incomingOffer: data.offer,
                pendingCandidates: [],
            });
        });

        socket.on("callAccepted", async (data) => {
            const state = get();

            if (
                data.callId !== state.callId ||
                !state.peerConnection
            ) return;

            try {
                await state.peerConnection.setRemoteDescription(
                    new RTCSessionDescription(data.answer)
                );

                for (const candidate of get().pendingCandidates) {
                    await state.peerConnection.addIceCandidate(
                        new RTCIceCandidate(candidate)
                    );
                }

                set({
                    pendingCandidates: [],
                    callStatus: "connecting",
                });
            } catch (error) {
                console.error("Call answer error:", error);
                get().cleanupCall();
                toast.error("Could not connect the call");
            }
        });

        socket.on("iceCandidate", async (data) => {
            const state = get();

            if (
                data.callId !== state.callId ||
                String(data.fromUserId) !== String(state.peerUserId)
            ) return;

            const pc = get().peerConnection;

            if (!pc?.remoteDescription) {
                set((current) => ({
                    pendingCandidates: [
                        ...current.pendingCandidates,
                        data.candidate,
                    ],
                }));
                return;
            }

            try {
                await pc.addIceCandidate(
                    new RTCIceCandidate(data.candidate)
                );
            } catch (error) {
                console.error("ICE candidate error:", error);
            }
        });

        socket.on("callRejected", (data) => {
            if (data.callId !== get().callId) return;

            get().cleanupCall();
            toast("Call was rejected");
        });

        socket.on("callEnded", (data) => {
            if (data.callId !== get().callId) return;

            get().cleanupCall();
            toast("Call ended");
        });

        socket.on("callUnavailable", (data) => {
            if (data.callId !== get().callId) return;

            get().cleanupCall();
            toast.error("User is unavailable");
        });
    },

    removeCallListeners: () => {
        const socket = get().listeningSocket;

        if (socket) {
            socket.off("incomingCall");
            socket.off("callAccepted");
            socket.off("iceCandidate");
            socket.off("callRejected");
            socket.off("callEnded");
            socket.off("callUnavailable");
        }

        set({ listeningSocket: null });
    },
}));

export { useCallStore };
