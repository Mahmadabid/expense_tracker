import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowLedger",
    short_name: "FlowLedger",
    description:
      "FlowLedger helps teams and friends collaborate on expenses, loans, and repayments with encrypted storage and real-time dashboards.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
  lang: "en-US",
    icons: [
      {
        src: "/icons/flowledger-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icons/flowledger-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Log expense",
        url: "/#log-expense",
        description: "Quickly capture a new expense entry.",
      },
      {
        name: "Track loan",
        url: "/#track-loan",
        description: "Jump to the loan management form.",
      },
    ],
  };
}
