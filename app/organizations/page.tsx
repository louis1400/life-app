import type { Metadata } from "next";
import Watchlist from "./watchlist";
export const metadata: Metadata = {title:"Organizations · life-app",description:"Places I would like to work."};
export default function OrganizationsPage() { return <Watchlist/>; }
