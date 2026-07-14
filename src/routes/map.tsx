import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFoodTrucks, getFoodTruck } from "@/lib/food-trucks.functions";
import { isPopupOpenNow } from "@/lib/popup-open";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Navigation, AlertCircle, List, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): { popup?: string } => ({
    popup: typeof search.popup === "string" ? search.popup : undefined,
  }),
  component: MapPage,
});

type Popup = Awaited<ReturnType<typeof getFoodTrucks>>[number];

function MapPage() {
  const { popup: focusId } = Route.useSearch();
  const [openOnly, setOpenOnly] = useState(false);
  const { maps, isLoaded, error } = useGoogleMaps();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const navigate = useNavigate();

  const { data: popups, isLoading } = useQuery({
    queryKey: ["pop-ups"],
    queryFn: () => getFoodTrucks(),
  });

  const { data: focused } = useQuery({
    queryKey: ["pop-up", focusId],
    queryFn: () => getFoodTruck({ data: { id: focusId! } }),
    enabled: !!focusId,
  });

  const located = (popups ?? [])
    .filter((t) => isPopupOpenNow(t))
    .filter(
      (t): t is Popup & { current_latitude: number; current_longitude: number } =>
        t.current_latitude != null && t.current_longitude != null
    );
  const visible = openOnly ? located.filter((t) => t.is_open_now) : located;

  useEffect(() => {
    if (!maps || !mapEl.current || mapRef.current) return;
    mapRef.current = new maps.maps.Map(mapEl.current, {
      center: { lat: 39.5, lng: -98.35 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoRef.current = new maps.maps.InfoWindow();
  }, [maps]);

  useEffect(() => {
    if (!maps || !mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (visible.length === 0) return;
    const bounds = new maps.maps.LatLngBounds();

    visible.forEach((popup) => {
      const position = {
        lat: popup.current_latitude,
        lng: popup.current_longitude,
      };
      const isFocus = popup.id === focusId;
      const marker = new maps.maps.Marker({
        position,
        map: mapRef.current!,
        title: popup.name,
        zIndex: isFocus ? 999 : undefined,
        icon: {
          path: maps.maps.SymbolPath.CIRCLE,
          scale: isFocus ? 13 : 9,
          fillColor: popup.is_open_now ? "#16a34a" : "#64748b",
          fillOpacity: 1,
          strokeColor: isFocus ? "#d97706" : "#ffffff",
          strokeWeight: isFocus ? 4 : 2,
        },
      });
      marker.addListener("click", () => {
        if (!infoRef.current) return;
        infoRef.current.setContent(
          `<div style="min-width:160px"><div style="font-weight:700;margin-bottom:2px">${popup.name}</div>` +
            `<div style="font-size:12px;margin-top:4px;color:${popup.is_open_now ? "#16a34a" : "#64748b"}">${popup.is_open_now ? "Open now" : "Closed"}</div>` +
            `<a href="/popup/${popup.id}" style="font-size:12px;color:#d97706;display:inline-block;margin-top:6px">View details &rarr;</a></div>`
        );
        infoRef.current.open(mapRef.current!, marker);
      });
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    const focusPopup = focusId ? visible.find((t) => t.id === focusId) : undefined;
    if (focusPopup) {
      mapRef.current.setCenter({
        lat: focusPopup.current_latitude,
        lng: focusPopup.current_longitude,
      });
      mapRef.current.setZoom(15);
    } else if (visible.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(13);
    } else {
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [maps, visible, navigate, focusId]);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: "1.5rem", paddingBottom: "2rem" }}>
        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
          <div>
            <h1 className="flex items-center gap-1" style={{ fontSize: "1.75rem" }}>
              <Navigation size={24} style={{ color: "var(--accent)" }} />
              Pop-Up Map
            </h1>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              See where pop-ups are right now and which are open.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={openOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setOpenOnly((v) => !v)}
            >
              <span className={openOnly ? "dot dot--open" : "dot"} />
              Open now
            </Button>
            <Link to="/">
              <Button variant="outline" size="sm">
                <List size={16} />
                List view
              </Button>
            </Link>
          </div>
        </div>

        {focused && (
          <Card style={{ marginBottom: "1.5rem" }}>
            <CardContent>
              <div className="detail-top">
                <div className="detail-top__main stack-sm">
                  <div className="flex items-center justify-between gap-1" style={{ flexWrap: "wrap" }}>
                    <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
                      <h2 style={{ fontSize: "1.4rem" }}>{focused.truck.name}</h2>
                      <Badge variant={focused.truck.is_open_now ? "open" : "closed"}>
                        {focused.truck.is_open_now ? "Open Now" : "Closed"}
                      </Badge>
                    </div>
                    <Link to="/map" search={{ popup: undefined }}>
                      <Button variant="ghost" size="icon" aria-label="Clear selection">
                        <X size={16} />
                      </Button>
                    </Link>
                  </div>

                  {focused.truck.description && (
                    <p style={{ lineHeight: 1.6 }}>{focused.truck.description}</p>
                  )}

                  {focused.truck.current_location_address && (
                    <p className="muted flex items-start gap-1" style={{ fontSize: "0.9rem" }}>
                      <MapPin size={16} className="shrink-0" style={{ marginTop: 2 }} />
                      {focused.truck.current_location_address}
                    </p>
                  )}

                  <Link to="/popup/$popupId" params={{ popupId: focused.truck.id }}>
                    <Button variant="outline" size="sm">
                      View full details
                      <ExternalLink size={14} />
                    </Button>
                  </Link>
                </div>

                {focused.truck.spot_photo_url && (
                  <div className="detail-top__media">
                    <img
                      src={focused.truck.spot_photo_url}
                      alt={`Where ${focused.truck.name} is located`}
                      className="detail-img"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card style={{ overflow: "hidden" }}>
          <CardContent className="nb-card__content--flush relative">
            <div ref={mapEl} className="map-canvas" />

            {(error || (!isLoaded && !error)) && (
              <div className="map-overlay">
                {error ? (
                  <div className="text-center muted" style={{ padding: "0 1rem" }}>
                    <AlertCircle size={32} style={{ color: "var(--closed)", margin: "0 auto 0.5rem" }} />
                    <p>Map could not load. {error}</p>
                  </div>
                ) : (
                  <Loader2 size={32} className="spin muted" />
                )}
              </div>
            )}

            {isLoaded && !isLoading && visible.length === 0 && (
              <div className="map-overlay" style={{ pointerEvents: "none" }}>
                <div className="text-center muted" style={{ padding: "0 1rem" }}>
                  <MapPin size={32} style={{ margin: "0 auto 0.5rem" }} />
                  <p style={{ fontWeight: 700 }}>No pop-ups to show on the map</p>
                  <p style={{ fontSize: "0.9rem" }}>
                    {openOnly
                      ? "No open pop-ups have shared a location yet."
                      : "Pop-ups need a current location to appear here."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {visible.length > 0 && (
          <div className="grid-cards" style={{ marginTop: "1.5rem" }}>
            {visible.map((popup) => (
              <Link key={popup.id} to="/map" search={{ popup: popup.id }}>
                <Card className={`nb-card--link${popup.id === focusId ? " nb-card--selected" : ""}`}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-1">
                      <h3 style={{ fontSize: "1.05rem" }}>{popup.name}</h3>
                      <Badge variant={popup.is_open_now ? "open" : "closed"} className="shrink-0">
                        {popup.is_open_now ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    {popup.current_location_address && (
                      <p className="muted flex items-center gap-1 mt-1" style={{ fontSize: "0.85rem" }}>
                        <MapPin size={14} className="shrink-0" />
                        {popup.current_location_address}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
