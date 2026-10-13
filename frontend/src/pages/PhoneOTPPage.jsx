
import { useRef, useState } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { auth } from "../lib/firebase";

const PhoneOTPPage = ({ onVerified }) => {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const confirmationRef = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOTP = async (e) => {
    e.preventDefault();

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setLoading(true);

    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
      }

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "normal",
      });

      recaptchaRef.current = verifier;

      const confirmation = await signInWithPhoneNumber(
        auth,
        `+91${phoneNumber}`,
        verifier
      );

      confirmationRef.current = confirmation;
      setOtpSent(true);
      toast.success("OTP sent successfully!");
    } catch (error) {
      console.error("OTP error:", error);
      toast.error(error.message || "Could not send OTP");
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      await confirmationRef.current.confirm(otp);
      setVerified(true);
      onVerified?.();
      toast.success("Mobile number verified!");
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Invalid OTP or verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-bold text-center">
            {verified ? "Choose an Option" : "Mobile Verification"}
          </h1>

          <p className="text-center opacity-70">
            {verified
              ? "Your mobile number has been verified."
              : "Verify your mobile number to continue."}
          </p>

          {!verified && (
            <>
              {!otpSent ? (
                <form onSubmit={sendOTP} className="mt-4 space-y-4">
                  <label className="form-control w-full">
                    <span className="label-text mb-2">Mobile Number</span>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-3 rounded-lg bg-base-200">
                        +91
                      </span>
                      <input
                        type="tel"
                        className="input input-bordered w-full"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={(e) =>
                          setPhoneNumber(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        required
                      />
                    </div>
                  </label>

                  <div id="recaptcha-container"></div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyOTP} className="mt-4 space-y-4">
                  <p className="text-sm text-center">
                    OTP sent to +91 {phoneNumber}
                  </p>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input input-bordered w-full text-center tracking-widest"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading}
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost w-full"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      confirmationRef.current = null;
                      recaptchaRef.current?.clear();
                      recaptchaRef.current = null;
                    }}
                  >
                    Change Mobile Number
                  </button>
                </form>
              )}
            </>
          )}

          {verified && (
            <div className="mt-4 space-y-3">
              <button
                className="btn btn-primary w-full"
                onClick={() => navigate("/signup")}
              >
                Create New Account — Sign Up
              </button>

              <button
                className="btn btn-outline w-full"
                onClick={() => navigate("/login")}
              >
                Already have an account? Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhoneOTPPage;
