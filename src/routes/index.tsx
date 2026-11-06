import { createFileRoute } from "@tanstack/react-router";
import { HybridEngine } from "@/components/fhe/HybridEngine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FYRE Hybrid Engine" },
      { name: "description", content: "Combine two FCBC DNA tokens and generate a Fyre Hybrid datasheet." },
      { property: "og:title", content: "FYRE Hybrid Engine" },
      { property: "og:description", content: "Combine two FCBC DNA tokens and generate a Fyre Hybrid datasheet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HybridEngine,
});
