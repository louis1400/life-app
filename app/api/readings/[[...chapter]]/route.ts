import { env } from "cloudflare:workers";
import { readingApi } from "@/modules/study/worker/readings.mjs";
export const GET = (request: Request) => readingApi(request, env);
export const PUT = GET;
