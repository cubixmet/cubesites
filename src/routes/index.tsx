import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CuboSites — Site bookkeeping for contractors" },
      {
        name: "description",
        content:
          "Track expenses, client payments, staff and progress photos across all your construction sites with CuboSites.",
      },
      { property: "og:site_name", content: "CuboSites" },
      { property: "og:title", content: "CuboSites — Site bookkeeping for contractors" },
      {
        property: "og:description",
        content:
          "Mobile-first bookkeeping for contractors managing multiple construction worksites. Built in control.",
      },
      { name: "twitter:title", content: "CuboSites — Site bookkeeping for contractors" },
      {
        name: "twitter:description",
        content:
          "Mobile-first bookkeeping for contractors managing multiple construction worksites. Built in control.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: authService.currentUser() ? "/dashboard" : "/login", replace: true });
  }, [nav]);
  return (
    <div className="grid min-h-screen place-items-center">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  );
}
