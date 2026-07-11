import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMyTruck,
  createFoodTruck,
  updateFoodTruck,
  createMenuItem,
  deleteMenuItem,
  createSchedule,
  deleteSchedule,
  getFoodTruck,
} from "@/lib/food-trucks.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  Utensils,
  Store,
  Save,
  Share2,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ImageUpload } from "@/components/ImageUpload";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type SocialLink = { label: string; url: string };

function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is SocialLink =>
      !!v && typeof v === "object" && typeof (v as SocialLink).label === "string" && typeof (v as SocialLink).url === "string"
  );
}

type PopupRow = Database["public"]["Tables"]["food_trucks"]["Row"];

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function Loader() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
      <Loader2 size={32} className="spin muted" />
    </div>
  );
}

function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) return <Loader />;
  if (!user) return <Navigate to="/auth" />;

  return <DashboardContent />;
}

function DashboardContent() {
  const { data: popup, isLoading } = useQuery({
    queryKey: ["my-popup"],
    queryFn: () => getMyTruck(),
  });

  if (isLoading) return <Loader />;
  if (!popup) return <CreatePopupForm />;
  return <ManagePopup popup={popup} />;
}

function CreatePopupForm() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spotPhoto, setSpotPhoto] = useState<string | null>(null);
  const [menuPhoto, setMenuPhoto] = useState<string | null>(null);
  const [address, setAddress] = useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      description: string;
      spot_photo_url: string;
      menu_photo_url: string;
      current_location_address: string;
    }) => createFoodTruck({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-popup"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description,
      spot_photo_url: spotPhoto ?? "",
      menu_photo_url: menuPhoto ?? "",
      current_location_address: address,
    });
  };

  return (
    <div className="page container" style={{ maxWidth: 640, paddingTop: "2rem", paddingBottom: "3rem" }}>
      <Card>
        <CardHeader>
          <CardTitle>
            <Store size={20} style={{ color: "var(--accent)" }} />
            Create Your Pop-Up
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="stack-sm">
            <div>
              <Label htmlFor="popup-name">Pop-Up Name</Label>
              <Input
                id="popup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tasty Tacos"
                required
              />
            </div>
            <div>
              <Label htmlFor="popup-desc">Description</Label>
              <Textarea
                id="popup-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your pop-up..."
                rows={3}
              />
            </div>
            {user && (
              <>
                <ImageUpload
                  userId={user.id}
                  value={spotPhoto}
                  onChange={setSpotPhoto}
                  label="Photo of the Spot"
                  hint="A picture of where your pop-up is set up."
                />
                <ImageUpload
                  userId={user.id}
                  value={menuPhoto}
                  onChange={setMenuPhoto}
                  label="Photo of the Menu"
                  hint="A picture of your menu board."
                />
              </>
            )}
            <div>
              <Label htmlFor="popup-address">Current Location Address</Label>
              <Input
                id="popup-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
              />
            </div>
            <Button type="submit" className="nb-btn--block" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
              Create Pop-Up
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function SharePopup({ popup }: { popup: PopupRow }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const slug = (popup as { slug?: string | null }).slug;
  const shareUrl = slug ? `${origin}/p/${slug}` : `${origin}/map?popup=${popup.id}`;

  const ready =
    !!popup.spot_photo_url &&
    !!popup.menu_photo_url &&
    !!popup.current_location_address;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>
          <Share2 size={20} style={{ color: "var(--accent)" }} />
          Share Your Pop-Up
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!ready && (
          <p className="muted mb-2" style={{ fontSize: "0.85rem" }}>
            Tip: add a spot photo, menu photo, and current address so visitors see your full info.
          </p>
        )}
        <div className="nb-share">
          <p style={{ fontSize: "0.9rem" }}>
            This link opens the map focused on your pop-up with all your info.
          </p>
          <div className="nb-share__row">
            <span className="nb-share__link">{shareUrl}</span>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagePopup({ popup }: { popup: PopupRow }) {
  return (
    <div className="page container" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}>
      <div className="mb-4">
        <h1>{popup.name}</h1>
        <p className="muted">Manage your pop-up profile, menu, and schedule.</p>
      </div>

      <SharePopup popup={popup} />

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <PopupProfileForm popup={popup} />
        </TabsContent>

        <TabsContent value="menu">
          <MenuManager popupId={popup.id} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleManager popupId={popup.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SocialLinksEditor({
  value,
  onChange,
}: {
  value: SocialLink[];
  onChange: (v: SocialLink[]) => void;
}) {
  const update = (i: number, patch: Partial<SocialLink>) =>
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { label: "", url: "" }]);

  return (
    <div>
      <Label>Social Media Links</Label>
      <div className="stack-xs" style={{ marginTop: "0.5rem" }}>
        {value.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={s.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Instagram"
              style={{ maxWidth: 140 }}
            />
            <Input
              value={s.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://instagram.com/yourpopup"
              className="flex-1"
            />
            <Button variant="ghost" size="icon" className="nb-btn--danger" onClick={() => remove(i)}>
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={add} type="button">
          <Plus size={16} />
          Add Link
        </Button>
      </div>
    </div>
  );
}

function PopupProfileForm({ popup }: { popup: PopupRow }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [name, setName] = useState(popup.name);
  const [description, setDescription] = useState(popup.description || "");
  const [spotPhoto, setSpotPhoto] = useState<string | null>(popup.spot_photo_url);
  const [menuPhoto, setMenuPhoto] = useState<string | null>(popup.menu_photo_url);
  const [address, setAddress] = useState(popup.current_location_address || "");
  const [isOpen, setIsOpen] = useState(popup.is_open_now);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    parseSocialLinks((popup as { social_links?: unknown }).social_links)
  );

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      description: string;
      spot_photo_url: string | null;
      menu_photo_url: string | null;
      social_links: SocialLink[];
      current_location_address: string;
      is_open_now: boolean;
    }) => updateFoodTruck({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-popup"] }),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: popup.id,
      name,
      description,
      spot_photo_url: spotPhoto,
      menu_photo_url: menuPhoto,
      social_links: socialLinks.filter((s) => s.label.trim() && s.url.trim()),
      current_location_address: address,
      is_open_now: isOpen,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pop-Up Profile</CardTitle>
      </CardHeader>
      <CardContent className="stack-sm">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        {user && (
          <div className="grid-two">
            <ImageUpload
              userId={user.id}
              value={spotPhoto}
              onChange={setSpotPhoto}
              label="Photo of the Spot"
              hint="Where your pop-up is set up."
            />
            <ImageUpload
              userId={user.id}
              value={menuPhoto}
              onChange={setMenuPhoto}
              label="Photo of the Menu"
              hint="Your menu board."
            />
          </div>
        )}
        <div>
          <Label>Current Location Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          {!popup.current_latitude && !popup.current_longitude && (
            <p className="flex items-center gap-1 mt-1" style={{ fontSize: "0.8rem", color: "var(--accent)" }}>
              <AlertCircle size={14} />
              Save your address to place your pop-up on the map.
            </p>
          )}
        </div>
        <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
        <div className="flex items-center gap-1">
          <Switch checked={isOpen} onCheckedChange={setIsOpen} id="open-toggle" />
          <Label htmlFor="open-toggle">Currently Open</Label>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

function MenuManager({ popupId }: { popupId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pop-up", popupId],
    queryFn: () => getFoodTruck({ data: { id: popupId } }),
  });

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: {
      truck_id: string;
      name: string;
      description: string;
      price: number;
    }) => createMenuItem({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pop-up", popupId] });
      setName("");
      setDesc("");
      setPrice("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: string }) => deleteMenuItem({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pop-up", popupId] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!name || Number.isNaN(numPrice) || numPrice <= 0) return;
    createMutation.mutate({
      truck_id: popupId,
      name,
      description: desc,
      price: numPrice,
    });
  };

  return (
    <div className="stack-lg">
      <Card>
        <CardHeader>
          <CardTitle>
            <Utensils size={20} style={{ color: "var(--accent)" }} />
            Menu Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <div className="stack-xs">
              {data?.menuItems.length === 0 && <p className="muted">No menu items yet.</p>}
              {data?.menuItems.map((item) => (
                <div key={item.id} className="nb-tile flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 700 }}>{item.name}</p>
                    {item.description && <p className="muted" style={{ fontSize: "0.85rem" }}>{item.description}</p>}
                    <p style={{ fontWeight: 700, color: "var(--accent)", fontSize: "0.9rem" }}>
                      ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="nb-btn--danger"
                    onClick={() => deleteMutation.mutate({ id: item.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Menu Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="form-grid-4">
            <div style={{ gridColumn: "span 2" }}>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Price</Label>
              <div className="relative">
                <DollarSign size={16} className="nb-field-icon" />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="nb-input--with-icon"
                  required
                />
              </div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <Label>Description</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional" />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus size={16} /> Add
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ScheduleManager({ popupId }: { popupId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["pop-up", popupId],
    queryFn: () => getFoodTruck({ data: { id: popupId } }),
  });

  const [day, setDay] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: {
      truck_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      location_name: string;
      location_address: string;
    }) => createSchedule({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pop-up", popupId] });
      setDay(1);
      setStart("09:00");
      setEnd("17:00");
      setLocationName("");
      setLocationAddress("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { id: string }) => deleteSchedule({ data: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pop-up", popupId] }),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      truck_id: popupId,
      day_of_week: day,
      start_time: start,
      end_time: end,
      location_name: locationName,
      location_address: locationAddress,
    });
  };

  return (
    <div className="stack-lg">
      <Card>
        <CardHeader>
          <CardTitle>
            <Clock size={20} style={{ color: "var(--accent)" }} />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 size={20} className="spin" />
          ) : (
            <div className="stack-xs">
              {data?.schedules.length === 0 && <p className="muted">No schedule entries yet.</p>}
              {DAYS.map((dayName, dayIndex) => {
                const daySchedules = data?.schedules.filter((s) => s.day_of_week === dayIndex) ?? [];
                if (daySchedules.length === 0) return null;
                return (
                  <div key={dayIndex} className="nb-tile">
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>{dayName}</p>
                    <div className="stack-xs">
                      {daySchedules.map((s) => (
                        <div key={s.id} className="flex items-center justify-between" style={{ fontSize: "0.9rem" }}>
                          <div className="flex items-center gap-1" style={{ flexWrap: "wrap" }}>
                            <MapPin size={14} className="muted" />
                            <span>
                              {s.start_time} – {s.end_time}
                            </span>
                            {s.location_name && <span className="muted">at {s.location_name}</span>}
                            {s.location_address && <span className="muted">({s.location_address})</span>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="nb-btn--danger"
                            onClick={() => deleteMutation.mutate({ id: s.id })}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} />
                          </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Add Schedule Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="grid-two">
            <div>
              <Label>Day</Label>
              <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid-two" style={{ gap: "0.5rem" }}>
              <div>
                <Label>Start</Label>
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label>Location Name</Label>
              <Input
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Downtown Plaza"
              />
            </div>
            <div>
              <Label>Location Address</Label>
              <Input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus size={16} /> Add Schedule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
