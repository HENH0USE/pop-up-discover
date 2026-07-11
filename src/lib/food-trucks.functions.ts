import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function createPublicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

type PhotoFields = {
  spot_photo_url: string | null;
  menu_photo_url: string | null;
};

// Replace stored storage paths with temporary signed URLs for public display.
async function withSignedPhotos<T extends PhotoFields>(trucks: T[]): Promise<T[]> {
  const paths = new Set<string>();
  for (const t of trucks) {
    if (t.spot_photo_url) paths.add(t.spot_photo_url);
    if (t.menu_photo_url) paths.add(t.menu_photo_url);
  }
  if (paths.size === 0) return trucks;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const list = Array.from(paths);
  const { data } = await supabaseAdmin.storage
    .from("truck-photos")
    .createSignedUrls(list, 3600);

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) map.set(item.path, item.signedUrl);
  }

  return trucks.map((t) => ({
    ...t,
    spot_photo_url: t.spot_photo_url ? map.get(t.spot_photo_url) ?? null : null,
    menu_photo_url: t.menu_photo_url ? map.get(t.menu_photo_url) ?? null : null,
  }));
}

// Public: list all active food trucks
export const getFoodTrucks = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("food_trucks")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return withSignedPhotos(data ?? []);
  }
);

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey || !address.trim()) return null;
  const url =
    "https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    status: string;
    results: Array<{
      geometry: { location: { lat: number; lng: number } };
    }>;
  };
  if (json.status !== "OK" || !json.results?.length) return null;
  const best = json.results[0];
  return {
    lat: best.geometry.location.lat,
    lng: best.geometry.location.lng,
  };
}

// Public: geocode a US ZIP / area code to coordinates via  gateway
export const geocodeZip = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ zip: z.string().trim().min(3).max(12) }).parse(input)
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Location lookup is not configured");
    }
    const url =
      "https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json" +
      `?components=${encodeURIComponent(`postal_code:${data.zip}|country:US`)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
      },
    });
    if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
    const json = (await res.json()) as {
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }>;
    };
    if (json.status !== "OK" || !json.results?.length) {
      return null;
    }
    const best = json.results[0];
    return {
      lat: best.geometry.location.lat,
      lng: best.geometry.location.lng,
      address: best.formatted_address,
    };
  });

// Build a URL-safe slug from a name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

// Generate a slug unique across food_trucks, ignoring an optional truck id
async function uniqueSlug(
  // slug column isn't in the generated types yet, so use a loose client type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  name: string,
  ignoreId?: string
): Promise<string> {
  const base = slugify(name) || "truck";
  let candidate = base;
  let n = 1;
  // Loop until we find a free slug
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from("food_trucks").select("id").eq("slug", candidate).limit(1);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query;
    if (!data || data.length === 0) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

// Public: resolve a truck id from its slug
export const getTruckIdBySlug = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: truck, error } = await (supabase.from("food_trucks") as any)
      .select("id")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return truck ? { id: (truck as { id: string }).id } : null;
  });

// Public: get single truck with menu and schedule
export const getFoodTruck = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = createPublicClient();
    const { data: truck, error: truckError } = await supabase
      .from("food_trucks")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (truckError) throw truckError;
    if (!truck) throw new Error("Truck not found");

    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("*")
      .eq("truck_id", data.id)
      .order("name");
    if (menuError) throw menuError;

    const { data: schedules, error: schedError } = await supabase
      .from("schedules")
      .select("*")
      .eq("truck_id", data.id)
      .order("day_of_week")
      .order("start_time");
    if (schedError) throw schedError;

    const [signedTruck] = await withSignedPhotos([truck]);
    return { truck: signedTruck, menuItems: menuItems ?? [], schedules: schedules ?? [] };
  });

// Authenticated: get current user's truck
export const getMyTruck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("food_trucks")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

// Authenticated: create a food truck
export const createFoodTruck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        cuisine_type: z.string().optional(),
        photo_url: z.string().url().optional().or(z.literal("")),
        spot_photo_url: z.string().optional(),
        menu_photo_url: z.string().optional(),
        social_links: z
          .array(z.object({ label: z.string().min(1).max(50), url: z.string().url() }))
          .optional(),
        current_latitude: z.number().nullable().optional(),
        current_longitude: z.number().nullable().optional(),
        current_location_address: z.string().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = await uniqueSlug(supabase as never, data.name);
    let lat: number | null = data.current_latitude ?? null;
    let lng: number | null = data.current_longitude ?? null;
    if (data.current_location_address && (lat == null || lng == null)) {
      const geo = await geocodeAddress(data.current_location_address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }
    const { data: result, error } = await supabase
      .from("food_trucks")
      .insert({
        owner_id: userId,
        name: data.name,
        slug,
        description: data.description || null,
        ...(data.cuisine_type
          ? { cuisine_type: data.cuisine_type as Database["public"]["Enums"]["cuisine_type"] }
          : {}),
        photo_url: data.photo_url || null,
        spot_photo_url: data.spot_photo_url || null,
        menu_photo_url: data.menu_photo_url || null,
        social_links: (data.social_links ?? []) as never,
        current_latitude: lat,
        current_longitude: lng,
        current_location_address: data.current_location_address || null,
      } as never)
      .select()
      .single();
    if (error) throw error;
    return result;
  });

// Authenticated: update food truck
export const updateFoodTruck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        cuisine_type: z.string().optional(),
        photo_url: z.string().url().optional().or(z.literal("")),
        spot_photo_url: z.string().nullable().optional(),
        menu_photo_url: z.string().nullable().optional(),
        social_links: z
          .array(z.object({ label: z.string().min(1).max(50), url: z.string().url() }))
          .optional(),
        current_latitude: z.number().nullable().optional(),
        current_longitude: z.number().nullable().optional(),
        current_location_address: z.string().optional(),
        is_open_now: z.boolean().optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership
    const { data: existing } = await supabase
      .from("food_trucks")
      .select("owner_id")
      .eq("id", data.id)
      .single();
    if (!existing || existing.owner_id !== userId) {
      throw new Error("Unauthorized");
    }

    type TruckUpdate = Database["public"]["Tables"]["food_trucks"]["Update"];
    const updateData: Partial<TruckUpdate> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      // Regenerate the shareable slug to match the new name
      (updateData as Record<string, unknown>).slug = await uniqueSlug(
        supabase,
        data.name,
        data.id
      );
    }
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.cuisine_type !== undefined) updateData.cuisine_type = data.cuisine_type as Database["public"]["Enums"]["cuisine_type"];
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url || null;
    if (data.spot_photo_url !== undefined) updateData.spot_photo_url = data.spot_photo_url || null;
    if (data.menu_photo_url !== undefined) updateData.menu_photo_url = data.menu_photo_url || null;
    if (data.social_links !== undefined) (updateData as Record<string, unknown>).social_links = data.social_links;
    if (data.current_location_address !== undefined) {
      const addr = data.current_location_address.trim();
      updateData.current_location_address = addr || null;
      if (addr) {
        const geo = await geocodeAddress(addr);
        if (geo) {
          updateData.current_latitude = geo.lat;
          updateData.current_longitude = geo.lng;
        }
      } else {
        updateData.current_latitude = null;
        updateData.current_longitude = null;
      }
    }
    if (data.current_latitude !== undefined) updateData.current_latitude = data.current_latitude ?? null;
    if (data.current_longitude !== undefined) updateData.current_longitude = data.current_longitude ?? null;
    if (data.is_open_now !== undefined) updateData.is_open_now = data.is_open_now;

    const { data: result, error } = await supabase
      .from("food_trucks")
      .update(updateData as TruckUpdate)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  });

// Authenticated: create menu item
export const createMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        truck_id: z.string().uuid(),
        name: z.string().min(1).max(100),
        description: z.string().max(300).optional(),
        price: z.number().positive(),
        photo_url: z.string().url().optional().or(z.literal("")),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership
    const { data: truck } = await supabase
      .from("food_trucks")
      .select("owner_id")
      .eq("id", data.truck_id)
      .single();
    if (!truck || truck.owner_id !== userId) {
      throw new Error("Unauthorized");
    }

    const { data: result, error } = await supabase
      .from("menu_items")
      .insert({
        truck_id: data.truck_id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        photo_url: data.photo_url || null,
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  });

// Authenticated: delete menu item
export const deleteMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership via truck
    const { data: item } = await supabase
      .from("menu_items")
      .select("truck_id")
      .eq("id", data.id)
      .single();
    if (!item) throw new Error("Not found");

    const { data: truck } = await supabase
      .from("food_trucks")
      .select("owner_id")
      .eq("id", item.truck_id)
      .single();
    if (!truck || truck.owner_id !== userId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase.from("menu_items").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

// Authenticated: create schedule entry
export const createSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        truck_id: z.string().uuid(),
        day_of_week: z.number().min(0).max(6),
        start_time: z.string().regex(/^\d{2}:\d{2}$/),
        end_time: z.string().regex(/^\d{2}:\d{2}$/),
        location_name: z.string().optional(),
        location_address: z.string().optional(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
      })
      .refine((data) => data.end_time > data.start_time, {
        message: "End time must be after start time",
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership
    const { data: truck } = await supabase
      .from("food_trucks")
      .select("owner_id")
      .eq("id", data.truck_id)
      .single();
    if (!truck || truck.owner_id !== userId) {
      throw new Error("Unauthorized");
    }

    const { data: result, error } = await supabase
      .from("schedules")
      .insert({
        truck_id: data.truck_id,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        location_name: data.location_name || null,
        location_address: data.location_address || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  });

// Authenticated: delete schedule entry
export const deleteSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: sched } = await supabase
      .from("schedules")
      .select("truck_id")
      .eq("id", data.id)
      .single();
    if (!sched) throw new Error("Not found");

    const { data: truck } = await supabase
      .from("food_trucks")
      .select("owner_id")
      .eq("id", sched.truck_id)
      .single();
    if (!truck || truck.owner_id !== userId) {
      throw new Error("Unauthorized");
    }

    const { error } = await supabase.from("schedules").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });
