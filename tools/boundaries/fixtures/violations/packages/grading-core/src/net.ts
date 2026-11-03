// Violation: packages-pure-network (a pure package calling fetch).
export async function remoteGrade(url: string): Promise<unknown> {
  const res = await fetch(url);
  return res.json();
}
