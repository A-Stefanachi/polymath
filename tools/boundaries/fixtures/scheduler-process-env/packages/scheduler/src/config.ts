// Violation (BL-0004 acceptance test 3): packages/scheduler reading process.env.
export const desiredRetention = Number(process.env.DESIRED_RETENTION ?? "0.85");
