import { forwardRef } from "react";
import { cn } from "../utils/cn";

const FormInput = forwardRef(function FormInput(
  { label, hint, error, id, className, type = "text", as = "input", children, ...rest },
  ref
) {
  const inputId = id || rest.name;

  let control;
  if (as === "textarea") {
    control = (
      <textarea
        id={inputId}
        ref={ref}
        className={cn("input min-h-[100px] font-mono text-sm", className)}
        {...rest}
      />
    );
  } else if (as === "select") {
    control = (
      <select id={inputId} ref={ref} className={cn("input pr-8", className)} {...rest}>
        {children}
      </select>
    );
  } else {
    control = (
      <input
        id={inputId}
        type={type}
        ref={ref}
        className={cn("input", className)}
        {...rest}
      />
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      {control}
      {hint && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
});

export default FormInput;
