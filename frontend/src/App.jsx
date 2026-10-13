import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import NotesPage from "./pages/NotesPage";
import PhoneOTPPage from "./pages/PhoneOTPPage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useEffect, useState } from "react";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route
          path="/phone-otp"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : (
              <PhoneOTPPage
                onVerified={() => setIsPhoneVerified(true)}
              />
            )
          }
        />

        <Route
          path="/"
          element={
            authUser ? (
              <HomePage />
            ) : isPhoneVerified ? (
              <Navigate to="/auth-choice" replace />
            ) : (
              <Navigate to="/phone-otp" replace />
            )
          }
        />

        <Route
          path="/auth-choice"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : isPhoneVerified ? (
              <div className="flex min-h-screen items-center justify-center gap-4">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.assign("/signup")}
                >
                  Sign Up
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => window.location.assign("/login")}
                >
                  Login
                </button>
              </div>
            ) : (
              <Navigate to="/phone-otp" replace />
            )
          }
        />

        <Route
          path="/signup"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : isPhoneVerified ? (
              <SignUpPage />
            ) : (
              <Navigate to="/phone-otp" replace />
            )
          }
        />

        <Route
          path="/login"
          element={
            authUser ? (
              <Navigate to="/" replace />
            ) : isPhoneVerified ? (
              <LoginPage />
            ) : (
              <Navigate to="/phone-otp" replace />
            )
          }
        />

        <Route
          path="/settings"
          element={authUser ? <SettingsPage /> : <Navigate to="/phone-otp" replace />}
        />

        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/phone-otp" replace />}
        />

        <Route
          path="/notes"
          element={authUser ? <NotesPage /> : <Navigate to="/phone-otp" replace />}
        />
      </Routes>
      <Toaster />
    </div>
  );
};
export default App;
