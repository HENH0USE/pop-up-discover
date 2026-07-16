import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFoodTruck } from "@/lib/food-trucks.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Clock, DollarSign, ArrowLeft, ExternalLink } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type FoodTruck = Database["public"]["Tables"]["food_trucks"]["Row"];
type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
type PopupDetail = { truck: FoodTruck; menuItems: MenuItem[]; schedules: Schedule[] };

export const Route = createFileRoute("/popup/$popupId")({
  component: PopupDetailPage,
  loader: async ({ params }) => {
    const truck = await getFoodTruck({ data: { id: params.popupId } });
    return { truck };
  },
});

function PopupDetailPage() {
  const { popupId } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const { data, isLoading } = useQuery<PopupDetail>({
    queryKey: ["food-truck", popupId],
    queryFn: () => getFoodTruck({ data: { id: popupId } }) as Promise<PopupDetail>,
    initialData: loaderData?.truck as PopupDetail | undefined,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
        <Loader2 size={32} className="spin muted" />
      </div>
    );
  }

  const truck = data.truck;
  const menuItems = data.menuItems;
  const schedules = data.schedules;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="page">
      <div className="nb-subbar">
        <div className="container">
          <Link to="/" className="nb-btn nb-btn--ghost nb-btn--sm">
            <ArrowLeft size={16} />
            Back to Pop-Ups
          </Link>
        </div>
      </div>

      <div className="container stack-lg" style={{ maxWidth: 880, paddingTop: "2rem", paddingBottom: "3rem" }}>
        <div className="stack-sm">
            <div>
              <div className="flex items-center gap-1 mb-1" style={{ flexWrap: "wrap" }}>
                <h1>{truck.name}</h1>
                <Badge variant={truck.is_open_now ? "open" : "closed"}>
                  {truck.is_open_now ? "Open Now" : "Closed"}
                </Badge>
              </div>
            </div>

            {truck.description && <p style={{ lineHeight: 1.6 }}>{truck.description}</p>}

            {truck.current_location_address && (
              <div className="flex items-start gap-1">
                <MapPin size={20} className="shrink-0" style={{ color: "var(--accent)", marginTop: 2 }} />
                <div>
                  <p style={{ fontWeight: 700 }}>{truck.current_location_address}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      truck.current_location_address
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nb-link flex items-center gap-1 mt-1"
                    style={{ fontSize: "0.85rem" }}
                  >
                    View on Google Maps
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}
        </div>

        <div className="grid-two">
          {truck.spot_photo_url ? (
            <img src={truck.spot_photo_url} alt="" className="detail-img" />
          ) : (
            <div className="media-box detail-img" />
          )}
          {truck.menu_photo_url ? (
            <img src={truck.menu_photo_url} alt="" className="detail-img" />
          ) : (
            <div className="media-box detail-img" />
          )}
        </div>

        {(() => {
          const raw = (truck as unknown as { social_links?: unknown }).social_links;
          const links = Array.isArray(raw)
            ? (raw as { label: string; url: string }[]).filter((l) => l && l.label && l.url)
            : [];
          if (links.length === 0) return null;
          return (
            <Card>
              <CardHeader>
                <CardTitle>
                  <ExternalLink size={20} style={{ color: "var(--accent)" }} />
                  Follow Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
                  {links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        {l.label}
                        <ExternalLink size={12} />
                      </Button>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardHeader>
            <CardTitle>
              <DollarSign size={20} style={{ color: "var(--accent)" }} />
              Menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menuItems.length === 0 ? (
              <p className="muted">No menu items listed.</p>
            ) : (
              <div className="grid-two">
                {menuItems.map((item) => (
                  <div key={item.id} className="nb-tile">
                    {item.photo_url && (
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        loading="lazy"
                        style={{
                          width: "100%",
                          aspectRatio: "4 / 3",
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 8,
                          display: "block",
                        }}
                      />
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <p style={{ fontWeight: 700 }}>{item.name}</p>
                      <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && <p className="muted" style={{ fontSize: "0.85rem" }}>{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Clock size={20} style={{ color: "var(--accent)" }} />
              Weekly Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="muted">No schedule posted yet.</p>
            ) : (
              <div className="stack-xs">
                {days.map((dayName, dayIndex) => {
                  const daySchedules = schedules.filter((s) => s.day_of_week === dayIndex);
                  if (daySchedules.length === 0) return null;
                  return (
                    <div key={dayIndex} className="sched-row">
                      <div className="sched-row__day">{dayName}</div>
                      <div className="stack-xs flex-1">
                        {daySchedules.map((s) => (
                          <div key={s.id} style={{ fontSize: "0.9rem" }}>
                            <span style={{ fontWeight: 700 }}>
                              {s.start_time} – {s.end_time}
                            </span>
                            {s.location_name && <span className="muted"> at {s.location_name}</span>}
                            {s.location_address && <span className="muted"> ({s.location_address})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
