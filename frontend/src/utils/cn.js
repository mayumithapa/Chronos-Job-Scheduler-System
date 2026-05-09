// Tiny class-name combiner (so we don't pull in `clsx` for one liner).
export function cn(...args) {
  return args.flat(Infinity).filter(Boolean).join(" ");
}
