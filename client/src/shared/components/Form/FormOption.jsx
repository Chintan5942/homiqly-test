import React, { useMemo } from "react";

const FormOption = ({
  label,
  description, // optional small helper text
  name,
  value, // important for radio groups
  type = "checkbox", // "checkbox" | "radio"
  checked,
  onChange,
  disabled = false,
  error,
  icon, // optional React node (e.g., <BadgeCheck />)
  className = "",
  ...rest
}) => {
  // Generate a stable id so label 'htmlFor' is unique (esp. for radios)
  const uid = useMemo(() => {
    const base = String(value ?? label ?? name ?? "opt");
    return `${name || "opt"}-${base.toLowerCase().replace(/\s+/g, "-")}`;
  }, [name, value, label]);

  const isRadio = type === "radio";

  return (

      <label
        htmlFor={uid}
        className={[
          "group flex w-full items-start gap-3 rounded-2xl border p-3",
          "transition-all duration-150 ease-out",
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:shadow-sm hover:border-primary/50",
          error
            ? "border-error/70 ring-1 ring-error/10"
            : "border-gray-200 bg-white",
          className,
        ].join(" ")}
      >
        {/* Control */}
        <input
          id={uid}
          name={name}
          type={type}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={!!error}
          className={[
            "mt-1 h-5 w-5 shrink-0 border-gray-300 focus:ring-2 focus:ring-primary focus:ring-offset-0",
            // color of the native control (Tailwind uses the browser accent color)
            "text-primary",
            // shape per control
            isRadio ? "rounded-full" : "rounded-md",
          ].join(" ")}
          {...rest}
        />

        {/* Text block */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon ? <span className="text-primary">{icon}</span> : null}
            <span
              className={
                disabled
                  ? "text-gray-400 font-medium"
                  : "text-gray-900 font-medium"
              }
            >
              {label}
            </span>
          </div>

          {description ? (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          ) : null}

          {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
        </div>
      </label>
  );
};

export default FormOption;
