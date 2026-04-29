import { supabase } from "@/integrations/supabase/client";
import { waterfalls } from "@/data/waterfalls";
import { experiences } from "@/data/experiences";
import { services } from "@/data/services";
import { accommodations } from "@/data/accommodations";
import { itineraries } from "@/data/itineraries";

type SyncItem = {
  name: string;
  type: string;
  segment: string;
  source_id: string;
  source_type: string;
  category: string;
  description: string | null;
  unit_price: number;
  variables: Record<string, unknown>;
};

function buildWaterfallItems(): SyncItem[] {
  return waterfalls.map((w) => ({
    name: w.name.pt,
    type: "waterfall",
    segment: "b2c",
    source_id: w.id,
    source_type: "static_waterfall",
    category: w.region,
    description: w.description.pt.slice(0, 200),
    unit_price: 0,
    variables: {
      difficulty: w.difficulty,
      seasonality: w.seasonality,
      distanceKm: w.distanceKm,
      distanceCarKm: w.distanceCarKm,
      requiresGuide: w.requiresGuide,
    },
  }));
}

function buildExperienceItems(): SyncItem[] {
  return experiences.map((e) => ({
    name: e.name.pt,
    type: "experience",
    segment: "b2c",
    source_id: e.id,
    source_type: "static_experience",
    category: e.category,
    description: `Faixa: ${e.priceRange}`,
    unit_price: 0,
    variables: {
      priceRange: e.priceRange,
      imageKey: e.imageKey,
    },
  }));
}

function buildServiceItems(): SyncItem[] {
  const items: SyncItem[] = [];
  for (const svc of services) {
    if (svc.tiers) {
      for (const tier of svc.tiers) {
        const priceNum = parseFloat(
          (tier.price || "0").replace(/[^\d.,]/g, "").replace(".", "").replace(",", ".")
        );
        items.push({
          name: `${svc.title.pt} – ${tier.name.pt}`,
          type: "service",
          segment: "b2c",
          source_id: tier.id,
          source_type: "static_service",
          category: svc.category,
          description: tier.description.pt.slice(0, 200),
          unit_price: priceNum,
          variables: { parentService: svc.id },
        });
      }
    }
    if (svc.items) {
      for (const item of svc.items) {
        const priceNum = parseFloat(
          (item.price || "0").replace(/[^\d.,]/g, "").replace(".", "").replace(",", ".")
        );
        items.push({
          name: `${svc.title.pt} – ${item.name.pt}`,
          type: "service",
          segment: "b2c",
          source_id: item.id,
          source_type: "static_service",
          category: svc.category,
          description: null,
          unit_price: priceNum,
          variables: { parentService: svc.id },
        });
      }
    }
    // For services without tiers or items (like "especial")
    if (!svc.tiers && !svc.items && !svc.transferTables) {
      items.push({
        name: svc.title.pt,
        type: "service",
        segment: "b2c",
        source_id: svc.id,
        source_type: "static_service",
        category: svc.category,
        description: svc.description.pt.slice(0, 200),
        unit_price: 0,
        variables: {},
      });
    }
    // Transfer tables as individual items
    if (svc.transferTables) {
      for (const table of svc.transferTables) {
        for (const row of table.rows) {
          const firstPrice = parseFloat(
            (row.values[0] || "0").replace(/[^\d.,]/g, "").replace(".", "").replace(",", ".")
          );
          items.push({
            name: `Transfer ${table.name.pt} – ${row.destination}`,
            type: "service",
            segment: "b2c",
            source_id: `${table.id}-${row.destination.toLowerCase().replace(/\s/g, "-")}`,
            source_type: "static_service",
            category: "transfer",
            description: table.description.pt.slice(0, 200),
            unit_price: firstPrice,
            variables: { 
              parentService: svc.id,
              transferType: table.id,
              destination: row.destination,
              allValues: row.values,
            },
          });
        }
      }
    }
  }
  return items;
}

function buildAccommodationItems(): SyncItem[] {
  return accommodations.map((a) => ({
    name: a.name,
    type: "accommodation",
    segment: "b2c",
    source_id: a.id,
    source_type: "static_accommodation",
    category: a.region,
    description: a.description.pt.slice(0, 200),
    unit_price: 0,
    variables: {
      priceRange: a.priceRange,
      units: a.units,
      totalCapacity: a.totalCapacity,
      accType: a.type,
      instagram: a.instagram || "",
      site: a.website || "",
      telefone: a.phone || "",
    },
  }));
}
function buildItineraryItems(): SyncItem[] {
  return itineraries.map((it) => ({
    name: it.name.pt,
    type: "itinerary",
    segment: "b2c",
    source_id: it.id,
    source_type: "static_itinerary",
    category: it.category,
    description: it.description.pt.slice(0, 200),
    unit_price: 0,
    variables: {
      duration: it.duration,
      pricing: it.pricing,
      extraCosts: it.extraCosts,
      days: it.days.map((d) => ({
        title: d.title.pt,
        imageKey: d.imageKey,
        difficulty: d.difficulty,
        entranceFee: d.entranceFee,
        trailDistanceKm: d.trailDistanceKm,
        attractions: d.attractions.pt,
      })),
      inclusions: it.inclusions.pt,
    },
  }));
}

export async function syncCatalog(): Promise<{ inserted: number; skipped: number }> {
  const allItems = [
    ...buildWaterfallItems(),
    ...buildExperienceItems(),
    ...buildServiceItems(),
    ...buildAccommodationItems(),
    ...buildItineraryItems(),
  ];

  // Fetch existing products by source_id
  const { data: existing } = await supabase
    .from("products")
    .select("source_id, source_type")
    .not("source_id", "is", null);

  const existingKeys = new Set(
    (existing || []).map((e) => `${e.source_type}::${e.source_id}`)
  );

  const toInsert = allItems.filter(
    (item) => !existingKeys.has(`${item.source_type}::${item.source_id}`)
  );

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: allItems.length };
  }

  const { error } = await supabase.from("products").insert(
    toInsert.map((item) => ({
      name: item.name,
      type: item.type,
      segment: item.segment,
      source_id: item.source_id,
      source_type: item.source_type,
      category: item.category,
      description: item.description,
      unit_price: item.unit_price,
      cost_price: 0,
      variables: item.variables as unknown as import("@/integrations/supabase/types").Json,
      is_active: true,
      currency: "BRL",
    }))
  );

  if (error) throw error;

  return { inserted: toInsert.length, skipped: allItems.length - toInsert.length };
}
