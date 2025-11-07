import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error,
  placeholder = "Select an option",
  icon,
  className = "",
  id,
  // NEW props:
  dropdownDirection = "down", // "down" | "up" | "auto"
  dropdownMaxHeight = 150, // px
  ...rest
}) => {
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [resolvedDirection, setResolvedDirection] = useState("down");

  // Normalize options
  const normOptions = options.map((opt) =>
    typeof opt === "object" ? opt : { label: String(opt), value: opt }
  );

  const selectedOption = normOptions.find(
    (o) => String(o.value) === String(value)
  );

  useEffect(() => {
    if (!open) setHighlightIndex(-1);
  }, [open, options.length]);

  // Compute position for fixed popup (use viewport coordinates, DO NOT add scroll offsets)
  const computePosition = (forcedDir) => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let dir = forcedDir || dropdownDirection;
    if (dropdownDirection === "auto") {
      if (spaceBelow >= dropdownMaxHeight) dir = "down";
      else if (spaceAbove >= dropdownMaxHeight) dir = "up";
      else dir = spaceBelow >= spaceAbove ? "down" : "up";
    }

    // For fixed positioning we should use viewport coords (rect.*) directly.
    let top;
    let maxHeight = dropdownMaxHeight;

    if (dir === "down") {
      top = rect.bottom; // viewport coordinate
      // if not enough space below, shrink maxHeight to available space
      if (spaceBelow < maxHeight) maxHeight = Math.max(40, spaceBelow - 8);
    } else {
      // up: place dropdown ending at rect.top
      // estimate actual content height with min(items*40, dropdownMaxHeight)
      const estimatedHeight = Math.min(
        normOptions.length * 40,
        dropdownMaxHeight
      );
      // top should be rect.top - estimatedHeight
      top = rect.top - estimatedHeight;
      // if top is negative, clamp to a small offset and reduce maxHeight accordingly
      if (top < 8) {
        const extra = 8 - top;
        top = 8;
        maxHeight = Math.max(40, estimatedHeight - extra);
      } else {
        maxHeight = estimatedHeight;
      }
    }

    setResolvedDirection(dir);
    setDropdownPos({
      top,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!open) return;
    computePosition();
    // Recompute immediately after open (in case fonts/layout shift)
    const t = setTimeout(() => computePosition(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dropdownDirection, dropdownMaxHeight, normOptions.length]);

  // Outside click & scroll handling
  useEffect(() => {
    if (!open) return;

    const onDocClick = (e) => {
      // support shadow DOM / portals
      const path = e.composedPath ? e.composedPath() : e.path || [];
      if (
        !path.includes(containerRef.current) &&
        !path.includes(listRef.current) &&
        !path.includes(buttonRef.current)
      ) {
        setOpen(false);
      }
    };

    const onScroll = (e) => {
      // If scrolling happens, recompute position — but if the scroll origin is window/document,
      // recompute using viewport coords so the dropdown stays attached to the button.
      // If the scroll occurs inside the dropdown (e.g. user scrolls the options), do nothing.
      const path = e.composedPath ? e.composedPath() : e.path || [];
      if (path.includes(listRef.current) || path.includes(buttonRef.current)) {
        // scrolling inside dropdown or button — do nothing
        return;
      }
      // If scroll is external, recompute position. If element moved far (or removed), closing is safer.
      // We'll recompute and keep open so user doesn't see gap.
      computePosition();
    };

    const onResize = () => computePosition();

    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keyboard handlers
  useEffect(() => {
    const onKey = (e) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i + 1;
          return next >= normOptions.length ? 0 : next;
        });
        setTimeout(() => {
          const highlightedItem = listRef.current?.querySelector(
            '[data-highlighted="true"]'
          );
          highlightedItem?.scrollIntoView({ block: "nearest" });
        }, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => {
          const next = i - 1;
          return next < 0 ? normOptions.length - 1 : next;
        });
        setTimeout(() => {
          const highlightedItem = listRef.current?.querySelector(
            '[data-highlighted="true"]'
          );
          highlightedItem?.scrollIntoView({ block: "nearest" });
        }, 0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < normOptions.length) {
          const opt = normOptions[highlightIndex];
          triggerChange(opt.value);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "Tab") {
        setOpen(false);
      }
    };

    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, highlightIndex, normOptions]);

  const triggerChange = (newValue) => {
    if (onChange && !disabled) {
      onChange({ target: { name, value: newValue } });
    }
    setOpen(false);
    setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((v) => !v);
  };

  const handleItemClick = (val) => triggerChange(val);

  return (
    <div
      className={`w-full relative ${className}`}
      ref={containerRef}
      {...rest}
    >
      {label && (
        <label
          htmlFor={id || name}
          className="block mb-1 text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div
        className={`relative flex items-center rounded-lg border ${
          error ? "border-red-400" : "border-gray-300"
        } bg-white shadow-sm transition-colors focus-within:ring-1 focus-within:ring-green-500  ${
          disabled ? "bg-gray-50 cursor-not-allowed" : ""
        }`}
      >
        {icon && (
          <div className="pl-3 text-gray-400 pointer-events-none">{icon}</div>
        )}

        <button
          id={id || name}
          type="button"
          ref={buttonRef}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={id || name}
          onClick={toggleOpen}
          disabled={disabled}
          className={`w-full text-left text-sm py-2 pr-3 outline-none bg-transparent flex items-center gap-2 ${
            icon ? "pl-2" : "px-3"
          } ${
            disabled
              ? "text-gray-400 cursor-not-allowed"
              : "text-gray-900 cursor-pointer"
          }`}
        >
          <span className="flex-1 text-sm truncate">
            {selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </span>

          <span className="flex-shrink-0 ml-3 text-gray-400 select-none">
            <svg
              className={`w-4 h-4 transform transition-transform duration-200 ${
                open ? "rotate-180" : "rotate-0"
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
      )}

      {open &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight ?? dropdownMaxHeight,
              minWidth: dropdownPos.width,
            }}
            role="listbox"
            aria-labelledby={id || name}
            tabIndex={-1}
            data-direction={resolvedDirection}
          >
            {normOptions.length === 0 ? (
              <div
                className="px-4 py-3 text-sm text-center text-gray-500"
                role="option"
              >
                No options available
              </div>
            ) : (
              <ul className="py-1 max-h-full overflow-auto">
                {normOptions.map((opt, idx) => {
                  const active = String(opt.value) === String(value);
                  const highlighted = idx === highlightIndex;
                  return (
                    <li
                      key={String(opt.value) + "-" + idx}
                      role="option"
                      aria-selected={active}
                      data-highlighted={highlighted}
                      className={`cursor-pointer select-none px-4 py-2 text-sm transition-colors duration-150 w-auto${
                        active
                          ? "bg-blue-50 text-green-600 font-medium"
                          : "text-gray-800"
                      } ${
                        highlighted ? "bg-gray-100" : ""
                      } hover:bg-gray-100 active:bg-gray-200`}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      onMouseLeave={() => setHighlightIndex(-1)}
                      onClick={() => handleItemClick(opt.value)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{opt.label}</span>
                        {active && (
                          <svg
                            className="flex-shrink-0 w-4 h-4 ml-2 text-green-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default FormSelect;
