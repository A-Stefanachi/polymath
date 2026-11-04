/** The grader's message without a lead-in that repeats the panel title ("Correct. ..."). */
export function feedbackBody(feedback: string | undefined, title: string): string {
  const text = (feedback ?? "").trim();
  return text.startsWith(title) ? text.slice(title.length).trim() : text;
}
