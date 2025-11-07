import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { toast } from "sonner";
import { Loader, Lock, Mail, User } from "lucide-react";
import { FormInput } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const { login } = useVendorAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password, remember);

      if (result.success) {
        toast.success("Login successful!");
        navigate("/vendor/dashboard");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-md mx-auto p-6">
      <div className="text-center">
        <img
          className="w-full h-10 object-contain"
          src="/homiqly-logo.png"
          alt="logo"
        />
      </div>
      <p className="mb-8 text-center text-gray-600 font-semibold">
        Vendor Panel Login
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="mt-1">
            <FormInput
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </div>
        </div>

        <div>
          <div className="mt-1 ">
            <FormInput
              icon={<Lock className="w-4 h-4" />}
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700"
            >
              Stay Signed In
            </label>
          </div>

          <div className="text-sm">
            <Link
              to="/vendor/forgot-password"
              className="font-medium text-primary hover:text-primary-dark"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full "
            variant="primary"
          >
            {loading ? (
              <>
                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Logging in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/vendor/register"
            className="font-medium text-primary hover:text-primary-dark"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
