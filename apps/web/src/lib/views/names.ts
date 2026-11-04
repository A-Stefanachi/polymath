// Plain names for node codes and project keys, for the map, progress and review screens (BL-0061).
const NODE_NAMES: Record<string, string> = {
  math: "Math",
  elec: "Electronics",
  sw: "Software",
  phys: "Physics",
  sens: "Sensors",
};

export function nodeName(code: string): string {
  return NODE_NAMES[code] ?? code.toUpperCase();
}

/** `prj.L1.led-blink-and-measure` becomes "Led blink and measure". */
export function projectName(key: string): string {
  const slug = key.split(".").slice(2).join(".").replaceAll("-", " ");
  return slug.length === 0 ? key : slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** `prj.L1.led-blink-and-measure` has ladder level "L1". */
export function projectLevel(key: string): string {
  return key.split(".")[1] ?? "";
}
