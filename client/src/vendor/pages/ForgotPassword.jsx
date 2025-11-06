import { useState } from "react";
import { Link } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { toast } from "react-toastify";
import { Loader, Lock, Mail } from "lucide-react";

// Replace these imports with your actual component paths if different
import { FormInput } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  const { requestPasswordReset, verifyResetCode, resetPassword } =
    useVendorAuth();

  const handleRequestReset = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        toast.success("Reset code sent to your email");
        setStep(2);
      } else {
        toast.error(result.error || "Failed to send reset code");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Reset request error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();

    if (!resetCode) {
      toast.error("Please enter the reset code");
      return;
    }

    setLoading(true);

    try {
      const result = await verifyResetCode(email, resetCode);

      if (result.success) {
        toast.success("Code verified successfully");
        setResetToken(result.token);
        setStep(3);
      } else {
        toast.error(result.error || "Invalid code");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Code verification error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please enter both password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(resetToken, newPassword);

      if (result.success) {
        toast.success("Password reset successfully");
        setStep(4);
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  // common container styles (light / white mode)
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm">
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Reset Your Password
          </h2>
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div >
              <div className="mt-2">
                {/* If your FormInput API differs, adapt props accordingly */}
                <FormInput
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vendor@example.com"
                  icon={<Mail className="h-5 w-5 text-gray-400" />}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-sm font-medium"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/vendor/login"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Verify Reset Code
          </h2>
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div>
              <div className="mt-2">
                <FormInput
                  id="resetCode"
                  name="resetCode"
                  type="text"
                  required
                  label="Reset Code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Enter the 6-digit code"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-sm font-medium"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Set New Password
          </h2>
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <div className="mt-2">
                <FormInput
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="h-5 w-5 text-gray-400" />}
                />
              </div>
            </div>

            <div>
              <div className="mt-2">
                <FormInput
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="h-5 w-5 text-gray-400" />}
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-sm font-medium"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <div className="mb-6 text-green-500">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">
            Password Reset Successful
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully.
          </p>
          <Link to="/vendor/login">
            <Button
              type="button"
              className="inline-block py-2 px-4 text-sm font-medium"
            >
              Back to Login
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
