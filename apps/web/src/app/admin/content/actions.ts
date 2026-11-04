"use server";

import { redirect } from "next/navigation";
import { approveTemplate, retireFromConsole, type ReviewOutcome } from "@/lib/admin/review";
import { reviewStores, sessionUserId } from "@/lib/admin/session";

// Server actions of the review console. Each one re-checks the admin row (ADR-018) inside the domain
// function and then redirects with the outcome code, so a reload never repeats the write.
async function run(act: (userId: string) => Promise<ReviewOutcome>, back: string): Promise<never> {
  const userId = await sessionUserId();
  const outcome = userId ? await act(userId) : "forbidden";
  redirect(`/admin/content?${back}${back ? "&" : ""}notice=${outcome}`);
}

export async function approveTemplateAction(form: FormData): Promise<never> {
  const key = form.get("template_key");
  const back = typeof key === "string" && /^tpl\.[a-z]+\.[a-z0-9-]+$/.test(key) ? `template=${key}` : "";
  return run((userId) => approveTemplate(reviewStores(), userId, form), back);
}

export async function retireItemAction(form: FormData): Promise<never> {
  return run((userId) => retireFromConsole(reviewStores(), userId, form), "");
}
