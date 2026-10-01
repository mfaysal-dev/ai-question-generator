import { createLanguageModel } from "@/lib/ai/provider";
import { handleGenerateRequest } from "@/lib/questions/handle-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleGenerateRequest(request, createLanguageModel);
}
