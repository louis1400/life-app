import { env } from "cloudflare:workers";
import { courseworkApi } from "@/modules/study/worker/coursework.mjs";
import { readingIds } from "@/lib/study";
export const GET = (request: Request) => courseworkApi(request, env, readingIds);
export const PUT = GET;
