import WatcherClient from "./WatcherClient";

export const metadata = {
  title: "Ask The Watcher — The Marvel Cartographer",
  description:
    "AI-powered Marvel Universe guide. Ask about reading orders, continuity, characters, and recommendations.",
};

export default function WatcherPage() {
  return <WatcherClient />;
}
