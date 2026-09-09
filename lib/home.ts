export type HomeOverview = {
  study: { courses: { id: string; name: string; week: number | null; title: string | null; done: number; total: number }[]; resume: { title: string; href: string; note: string } | null } | null;
  groceries: { packs: number; total: number } | null;
  vault: { count: number; latest: { id: string; title: string } | null } | null;
};
