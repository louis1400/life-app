import { z } from "zod";

export const statuses = ["Watching", "Researching", "Contacted", "Applied", "Paused"] as const;
const webUrl = z.string().trim().max(2000).refine(value => { try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; } }, "Use a full http or https URL.");
export const organizationInput = z.object({
  id: z.string().uuid(), name: z.string().trim().min(1).max(200),
  url: webUrl, reason: z.string().max(2000), notes: z.string().max(6000),
  nextStep: z.string().max(1000), status: z.enum(statuses),
  archived: z.boolean(), version: z.number().int().min(0),
}).strict();
export type Organization = z.infer<typeof organizationInput>;
export const starterOrganizations: Organization[] = [
  { id: "70207743-df43-4dd9-bcbb-a9dcf477c994", name: "Nederlandse Basketball Bond (NBB)", url: "https://basketball.nl/bondsorganisatie/vacatures/", reason: "Basketball is a world I care about and regularly spend time in.", notes: "Look for paid part-time work. Check hours, experience and diploma requirements for each role; volunteer work and internships are different options.", nextStep: "Check the vacancies page for work within 16–32 hours a week.", status: "Watching", archived: false, version: 0 },
  { id: "d3f52445-21e9-40b9-ae3e-1c6f036ec33a", name: "Erasmus Universiteit Rotterdam", url: "https://www.eur.nl/werken-bij-eur/vacatures/overzicht", reason: "A university I visit often and feel connected to.", notes: "Explore student-assistant and support roles. A completed bachelor’s is expected in 2027; check whether a role accepts students who are still studying.", nextStep: "Look for student-friendly roles and confirm at least 16 hours are available.", status: "Watching", archived: false, version: 0 },
];
