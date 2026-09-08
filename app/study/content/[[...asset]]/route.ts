import { studyAsset } from "@/lib/study";
export async function GET(_request: Request, context: { params: Promise<{ asset?: string[] }> }) {
  return studyAsset(((await context.params).asset || []).join("/"));
}
