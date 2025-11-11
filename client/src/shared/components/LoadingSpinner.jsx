import React, { useEffect } from "react";
import { Loader } from "lucide-react";

const LoadingSpinner = ({ fullscreen = true }) => {
  useEffect(() => {
    if (fullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden"; // prevent scroll
      return () => {
        document.body.style.overflow = prev; // restore
      };
    }
  }, [fullscreen]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center mb-10 bg-white/70 backdrop-blur-md`}
    >
      <Loader className="w-8 h-8 text-green-600 animate-spin" />
    </div>
  );
};

export default LoadingSpinner;
