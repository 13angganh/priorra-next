import { redirect } from "next/navigation";

/**
 * Root route ("/") redirects into the dashboard. Per Master
 * Instruction section 21 ("Dashboard langsung menampilkan
 * Next/Today"), the app should land the user directly in their task
 * list rather than an intermediate landing page.
 */
export default function Home() {
  redirect("/tasks");
}
