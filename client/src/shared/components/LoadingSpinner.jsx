import React, { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";

/**
 * Props:
 *  - loading (boolean)    : whether the spinner should be shown (controlled). default: true
 *  - fullscreen (boolean) : overlay covers viewport and blocks scroll. default: true
 *  - minVisibleMs (number): minimum visible time in ms. default: 1000
 *  - fadeMs (number)      : fade animation duration in ms. default: 300
 */
const LoadingSpinner = ({
  loading = true,
  fullscreen = true,
  minVisibleMs = 1500,
  fadeMs = 700,
}) => {
  const [render, setRender] = useState(loading); // whether overlay is in the DOM
  const [fadingOut, setFadingOut] = useState(false); // true when playing fade-out
  const startRef = useRef(0);
  const hideTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);

  // lock scroll while rendered & fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    if (render) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [render, fullscreen]);

  // respond to loading prop changes
  useEffect(() => {
    // Clear any pending timers when loading toggles
    const clearAll = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };

    if (loading) {
      // Show immediately (or cancel a fade-out)
      clearAll();
      setFadingOut(false);
      if (!render) setRender(true);
      // mark start time if just opened
      startRef.current = startRef.current || Date.now();
      return;
    }

    // loading === false: attempt to hide but enforce minimum visible time
    const elapsed = Date.now() - (startRef.current || Date.now());
    const remainingMin = Math.max(0, minVisibleMs - elapsed);

    // wait the remaining min duration, then start fade out
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      setFadingOut(true);

      // after fade completes, remove from DOM
      fadeTimerRef.current = setTimeout(() => {
        fadeTimerRef.current = null;
        setFadingOut(false);
        setRender(false);
        startRef.current = 0;
      }, fadeMs);
    }, remainingMin);

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, minVisibleMs, fadeMs]);

  // if never rendered and loading=false, don't render
  if (!render) return null;

  // class control for fade in / out
  const overlayClass = fadingOut ? "ls-fade-out" : "ls-fade-in";

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className={`${
          fullscreen ? "fixed inset-0 z-50" : "w-full"
        } flex items-center justify-center bg-white/70 backdrop-blur-md pointer-events-auto ${overlayClass}`}
        style={{ transition: `opacity ${fadeMs}ms ease` }}
      >
        <Loader className="w-12 h-12 text-green-600 animate-spin" />
      </div>

      <style jsx="true">{`
        .ls-fade-in {
          opacity: 1;
        }
        .ls-fade-out {
          opacity: 1;
        }
      `}</style>
    </>
  );
};

export default LoadingSpinner;
