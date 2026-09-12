-- Public catalog must never expose administrative product rows or arbitrary variables.
-- Apply with the matching frontend. No fallback to raw products is permitted.
BEGIN;
DROP POLICY IF EXISTS "Public can read products" ON public.products;

-- Pure projection helper. Schemas are fixed by the wrapper below, never supplied by callers.
CREATE OR REPLACE FUNCTION public.project_catalog_json(v jsonb, shape jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE result jsonb; child jsonb; entry record; element jsonb; kind text;
BEGIN
  IF v IS NULL OR v = 'null'::jsonb THEN RETURN NULL; END IF;
  IF jsonb_typeof(shape) = 'string' THEN
    kind := shape #>> '{}';
    IF kind = jsonb_typeof(v) OR (kind = 'primitive' AND jsonb_typeof(v) IN ('string','number','boolean')) THEN RETURN v; END IF;
    IF kind = 'boolean' AND v IN ('"true"'::jsonb, '"false"'::jsonb) THEN RETURN to_jsonb((v #>> '{}')::boolean); END IF;
    IF kind IN ('text','texts') THEN
      IF kind = 'text' AND jsonb_typeof(v) = 'string' THEN RETURN v; END IF;
      IF kind = 'texts' AND jsonb_typeof(v) = 'array' THEN RETURN public.project_catalog_json(v, '["string"]'); END IF;
      IF jsonb_typeof(v) = 'object' THEN
        IF kind = 'text' THEN RETURN public.project_catalog_json(v, '{"pt":"string","en":"string","es":"string"}');
        ELSE RETURN public.project_catalog_json(v, '{"pt":["string"],"en":["string"],"es":["string"]}'); END IF;
      END IF;
    END IF;
    RETURN NULL;
  ELSIF jsonb_typeof(shape) = 'array' THEN
    IF jsonb_typeof(v) <> 'array' THEN RETURN NULL; END IF;
    result := '[]';
    FOR element IN SELECT value FROM jsonb_array_elements(v) LOOP
      -- Inactive variants must not reappear through nested itinerary snapshots.
      IF jsonb_typeof(element) = 'object' AND element->'is_active' IN ('false'::jsonb, '"false"'::jsonb) THEN CONTINUE; END IF;
      child := public.project_catalog_json(element, shape->0);
      IF child IS NOT NULL THEN result := result || jsonb_build_array(child); END IF;
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(shape) = 'object' THEN
    IF jsonb_typeof(v) <> 'object' THEN RETURN NULL; END IF;
    result := '{}';
    FOR entry IN SELECT key, value FROM jsonb_each(shape) LOOP
      child := public.project_catalog_json(v->entry.key, entry.value);
      IF child IS NOT NULL THEN result := result || jsonb_build_object(entry.key, child); END IF;
    END LOOP;
    RETURN result;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.project_catalog_json(jsonb,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_catalog_variables(v jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $$
  SELECT coalesce(public.project_catalog_json(v, $shape${
  "storage_id": "string",
  "imageKey": "string",
  "region": "string",
  "difficulty": "string",
  "seasonality": "string",
  "type": "string",
  "accommodation_type": "string",
  "service_type": "string",
  "subcategory": "string",
  "subtitle": "string",
  "subtitle_en": "string",
  "subtitle_es": "string",
  "pricingType": "string",
  "priceRange": "string",
  "public_instagram": "string",
  "public_website": "string",
  "public_bookingUrl": "string",
  "public_phone": "string",
  "distanceKm": "number",
  "distanceCarKm": "number",
  "trailDistanceKm": "number",
  "limitPeople": "number",
  "units": "number",
  "totalCapacity": "number",
  "capacity": "primitive",
  "price": "number",
  "requiresGuide": "boolean",
  "requires4x4": "boolean",
  "gallery": [
    "string"
  ],
  "gallery_order": [
    "string"
  ],
  "favorites": [
    "string"
  ],
  "amenities": [
    "string"
  ],
  "duration": "primitive",
  "variations": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "unit_price": "number",
      "is_active": "boolean",
      "media": [
        "string"
      ]
    }
  ],
  "room_modalities": [
    {
      "type": "string",
      "capacity": "number",
      "sale_price": "number",
      "pricing_type": "string",
      "units": "number",
      "unit_label": "string",
      "total_units": "number",
      "max_capacity": "number",
      "modalities": [
        {
          "type": "string",
          "capacity": "number",
          "sale_price": "number",
          "pricing_type": "string",
          "units": "number"
        }
      ]
    }
  ],
  "days": [
    {
      "day": "number",
      "dayNumber": "number",
      "title": "text",
      "description": "text",
      "imageKey": "string",
      "images": [
        "string"
      ],
      "difficulty": "string",
      "entranceFee": "number",
      "trailDistanceKm": "number",
      "attractions": "texts",
      "items": [
        {
          "id": "string",
          "catalog_item_id": "string",
          "product_id": "string",
          "product_name": "text",
          "product_type": "string",
          "category": "string",
          "item_name": "string",
          "variation_id": "string",
          "imageKey": "string",
          "vehicle_type": "string",
          "description": "text",
          "images": [
            "string"
          ],
          "day_number": "number",
          "item_index": "number",
          "qty": "number",
          "product_variables": {
            "storage_id": "string",
            "imageKey": "string",
            "region": "string",
            "difficulty": "string",
            "seasonality": "string",
            "type": "string",
            "accommodation_type": "string",
            "service_type": "string",
            "subcategory": "string",
            "subtitle": "string",
            "subtitle_en": "string",
            "subtitle_es": "string",
            "pricingType": "string",
            "priceRange": "string",
            "public_instagram": "string",
            "public_website": "string",
            "public_bookingUrl": "string",
            "public_phone": "string",
            "distanceKm": "number",
            "distanceCarKm": "number",
            "trailDistanceKm": "number",
            "limitPeople": "number",
            "units": "number",
            "totalCapacity": "number",
            "capacity": "primitive",
            "price": "number",
            "requiresGuide": "boolean",
            "requires4x4": "boolean",
            "gallery": [
              "string"
            ],
            "gallery_order": [
              "string"
            ],
            "favorites": [
              "string"
            ],
            "amenities": [
              "string"
            ],
            "duration": "primitive",
            "variations": [
              {
                "id": "string",
                "name": "string",
                "description": "string",
                "unit_price": "number",
                "is_active": "boolean",
                "media": [
                  "string"
                ]
              }
            ],
            "room_modalities": [
              {
                "type": "string",
                "capacity": "number",
                "sale_price": "number",
                "pricing_type": "string",
                "units": "number",
                "unit_label": "string",
                "total_units": "number",
                "max_capacity": "number",
                "modalities": [
                  {
                    "type": "string",
                    "capacity": "number",
                    "sale_price": "number",
                    "pricing_type": "string",
                    "units": "number"
                  }
                ]
              }
            ],
            "public_email": "string",
            "longDescription_pt": "string",
            "longDescription_en": "string",
            "longDescription_es": "string",
            "total_capacity": "number",
            "total_rooms": "number"
          },
          "product_description": "text",
          "product_storage_info": {
            "prefix": "string",
            "folder": "string"
          }
        }
      ]
    }
  ],
  "inclusions": "texts",
  "pricing": {
    "atmos4x4": {
      "individual": "number",
      "dupla": "number",
      "trio": "number"
    },
    "carroProprio": {
      "individual": "number",
      "dupla": "number",
      "trio": "number"
    }
  },
  "extraCosts": {
    "entranceFees": "number",
    "equipmentFees": "number",
    "equipmentItems": "texts"
  },
  "public_email": "string",
  "longDescription_pt": "string",
  "longDescription_en": "string",
  "longDescription_es": "string",
  "total_capacity": "number",
  "total_rooms": "number"
}$shape$::jsonb), '{}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.public_catalog_variables(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_products(p_type text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'source_id', p.source_id, 'name', p.name, 'type', p.type,
    'category', p.category, 'segment', p.segment, 'description', p.description,
    'unit_price', p.unit_price, 'currency', p.currency, 'is_active', true,
    'updated_at', p.updated_at, 'variables', public.public_catalog_variables(p.variables)
  ) ORDER BY p.name, p.id), '[]'::jsonb)
  FROM public.products p
  WHERE p.is_active IS TRUE AND (p_type IS NULL OR p.type = p_type);
$$;
REVOKE ALL ON FUNCTION public.get_public_products(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_products(text) TO anon, authenticated;
COMMIT;
