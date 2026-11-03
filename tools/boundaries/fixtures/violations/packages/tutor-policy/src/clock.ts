// Violation: packages-pure-clock, twice (Date.now() and new Date() without an argument).
export const stampedAt = (): number => Date.now();
export const today = (): Date => new Date();
