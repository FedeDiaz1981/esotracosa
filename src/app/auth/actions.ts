"use server";

import { redirect } from "next/navigation";
import { signInWithCredentials, signOutViewerSession } from "@/infrastructure/auth/pintofruta-auth";

export type LoginActionState = {
  error?: string;
};

function normalizeReturnTo(value: FormDataEntryValue | null) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate) {
    return "/";
  }

  if (!candidate.startsWith("/")) {
    return "/";
  }

  return candidate;
}

export async function loginAction(_: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const returnTo = normalizeReturnTo(formData.get("returnTo"));

  const result = await signInWithCredentials(String(email ?? ""), String(password ?? ""));

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(returnTo);
}

export async function logoutAction(formData: FormData) {
  const returnTo = normalizeReturnTo(formData.get("returnTo"));
  await signOutViewerSession();
  redirect(returnTo);
}

