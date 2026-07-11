import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFoodTrucks, geocodeZip } from "@/lib/food-trucks.functions";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Search, Navigation, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const RADIUS_MILES = 5;

type Popup = Awaited<ReturnType<typeof getFoodTrucks>>[number];
type Located = Popup & { current_latitude: number; current_longitude: number };

function distanceMiles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function HomePage() {
  const navigate = useNavigate();
  const [zipInput, setZipInput] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: popups } = useQuery({
    queryKey: ["pop-ups"],
    queryFn: () => getFoodTrucks(),
  });

  const { maps, isLoaded, error: mapError } = useGoogleMaps();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const located = (popups ?? []).filter(
    (t): t is Located => t.current_latitude != null && t.current_longitude != null
  );

  const nearby = center
    ? located
        .map((t) => ({
          popup: t,
          dist: distanceMiles(center.lat, center.lng, t.current_latitude, t.current_longitude),
        }))
        .filter((x) => x.dist <= RADIUS_MILES)
        .sort((a, b) => a.dist - b.dist)
    : [];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const zip = zipInput.trim();
    if (!zip) return;
    setSearching(true);
    setGeoError(null);
    try {
      const result = await geocodeZip({ data: { zip } });
      if (!result) {
        setGeoError("We couldn't find that area code. Try another.");
        setCenter(null);
      } else {
        setCenter(result);
      }
    } catch {
      setGeoError("Location lookup failed. Please try again.");
      setCenter(null);
    } finally {
      setSearching(false);
    }
  }

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
    if (!maps || !mapRef.current || !center) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new maps.maps.LatLngBounds();

    const centerPos = { lat: center.lat, lng: center.lng };
    const centerMarker = new maps.maps.Marker({
      position: centerPos,
      map: mapRef.current,
      title: center.address,
      icon: {
        path: maps.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#d97706",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
    });
    markersRef.current.push(centerMarker);
    bounds.extend(centerPos);

    nearby.forEach(({ popup, dist }) => {
      const position = { lat: popup.current_latitude, lng: popup.current_longitude };
      const marker = new maps.maps.Marker({
        position,
        map: mapRef.current!,
        title: popup.name,
        icon: {
          path: maps.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: popup.is_open_now ? "#16a34a" : "#64748b",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        if (popup.is_open_now) {
          navigate({ to: "/popup/$popupId", params: { popupId: popup.id } });
          return;
        }
        if (!infoRef.current) return;
        infoRef.current.setContent(
          `<div style="min-width:170px"><div style="font-weight:700;margin-bottom:2px">${popup.name}</div>` +
            `<div style="font-size:12px;color:#64748b">${dist.toFixed(1)} mi</div>` +
            `<div style="font-size:12px;margin-top:4px;color:${popup.is_open_now ? "#16a34a" : "#64748b"}">${popup.is_open_now ? "Open now" : "Closed"}</div>` +
            `<a href="/popup/${popup.id}" style="font-size:12px;color:#d97706;display:inline-block;margin-top:6px">View details &rarr;</a></div>`
        );
        infoRef.current.open(mapRef.current!, marker);
      });
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (nearby.length > 0) {
      mapRef.current.fitBounds(bounds, 64);
    } else {
      mapRef.current.setCenter(centerPos);
      mapRef.current.setZoom(12);
    }
  }, [maps, center, nearby, navigate]);

  return (
    <div className="page">
      <section className="nb-hero">
        <div className="container text-center">
          <h1 className="nb-hero-gsap">List Your Pop-Up Live</h1>
          <p className="nb-hero__lead">
            Sign up as a vendor and start bringing people to your next drop.
          </p>
          <Link to="/auth" className="nb-btn">
            Sign Up
          </Link>
        </div>
      </section>

      <div className="container stack-lg" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        <Card className="nb-card">
          <CardContent className="text-center" style={{ padding: "2.5rem 1.5rem" }}>
            <h2 style={{ fontSize: "1.4rem", textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "0.75rem" }}>
              Your Pop-Up Card
            </h2>
            <p className="muted" style={{ maxWidth: 640, margin: "0 auto", lineHeight: 1.5 }}>
              Create a shareable card link with your info, menu and live location on google maps so customers can find you instantly.
            </p>
          </CardContent>
        </Card>

        <Card style={{ overflow: "hidden" }}>
          <CardContent className="nb-card__content--flush relative">
            <div ref={mapEl} className="map-canvas" />

            {(mapError || (!isLoaded && !mapError)) && (
              <div className="map-overlay">
                {mapError ? (
                  <div className="text-center muted" style={{ padding: "0 1rem" }}>
                    <AlertCircle size={32} style={{ color: "var(--closed)", margin: "0 auto 0.5rem" }} />
                    <p>Map could not load. {mapError}</p>
                  </div>
                ) : (
                  <Loader2 size={32} className="spin muted" />
                )}
              </div>
            )}

            {isLoaded && !mapError && !center && (
              <div className="map-overlay" style={{ pointerEvents: "none" }}>
                <div className="text-center muted" style={{ padding: "0 1rem" }}>
                  <MapPin size={32} style={{ margin: "0 auto 0.5rem" }} />
                  <p style={{ fontWeight: 700 }}>Enter your area code to start</p>
                  <p style={{ fontSize: "0.9rem" }}>
                    We'll show every Pop-Up around your community.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="nb-hero" style={{ padding: "3rem 1rem" }}>
        <div className="text-center">
          <h1>Find local vendors support your community</h1>
          <p className="nb-hero__lead">Pop in your area code</p>

          <form className="nb-search-row" onSubmit={handleSearch}>
            <div className="relative flex-1">
              <Search size={16} className="nb-field-icon" />
              <Input
                placeholder="Enter ZIP / area code..."
                value={zipInput}
                inputMode="numeric"
                onChange={(e) => setZipInput(e.target.value)}
                className="nb-input--with-icon"
              />
            </div>
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 size={16} className="spin" /> : <Navigation size={16} />}
              Search
            </Button>
          </form>
          {geoError && (
            <p className="mt-1" style={{ fontSize: "0.85rem", color: "var(--closed)" }}>
              {geoError}
            </p>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
        {center && (
          <section>
            <div className="flex items-center gap-1 mb-2">
              <Navigation size={20} style={{ color: "var(--accent)" }} />
              <h2 className="section-title">
                {nearby.length} pop-up{nearby.length === 1 ? "" : "s"} within {RADIUS_MILES} mi
              </h2>
            </div>
            {nearby.length === 0 ? (
              <p className="muted text-center" style={{ padding: "2rem 0" }}>
                No pop-ups are near {center.address} right now. Try another area code.
              </p>
            ) : (
              <div className="grid-cards">
                {nearby.map(({ popup, dist }) => (
                  <PopupCard key={popup.id} popup={popup} dist={dist} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PopupCard({
  popup,
  dist,
}: {
  popup: {
    id: string;
    name: string;
    spot_photo_url: string | null;
    description: string | null;
    current_location_address: string | null;
    is_open_now: boolean;
  };
  dist: number;
}) {
  return (
    <Link to="/popup/$popupId" params={{ popupId: popup.id }}>
      <Card className="nb-card--link" style={{ overflow: "hidden" }}>
        <div className="media-box relative">
          {popup.spot_photo_url ? (
            <img src={popup.spot_photo_url} alt={popup.name} loading="lazy" />
          ) : (
            <MapPin size={32} />
          )}
          <Badge
            variant={popup.is_open_now ? "open" : "closed"}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            {popup.is_open_now ? "Open Now" : "Closed"}
          </Badge>
        </div>
        <CardContent>
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 style={{ fontSize: "1.1rem" }}>{popup.name}</h3>
            <Badge variant="secondary" className="shrink-0">
              {dist.toFixed(1)} mi
            </Badge>
          </div>
          {popup.current_location_address && (
            <p className="muted flex items-center gap-1 mt-1" style={{ fontSize: "0.85rem" }}>
              <MapPin size={14} />
              {popup.current_location_address}
            </p>
          )}
          {popup.description && (
            <p className="muted clamp-2 mt-1" style={{ fontSize: "0.85rem" }}>
              {popup.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
