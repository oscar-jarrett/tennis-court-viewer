import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // @ts-ignore - Bypassing strict generic inference failure to safely inject basepath
  const router = createRouter({
    routeTree,
    basepath: "/tennis-court-viewer", // <-- Tells the router to start from your GitHub subfolder
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};