import { createFileRoute, redirect } from "@tanstack/react-router";
import { getTruckIdBySlug } from "@/lib/food-trucks.functions";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const result = await getTruckIdBySlug({ data: { slug: params.slug } });
    if (!result) {
      throw redirect({ to: "/map" });
    }
    throw redirect({ to: "/map", search: { truck: result.id } });
  },
  component: () => null,
});
