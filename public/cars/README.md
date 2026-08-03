# Car mockup images — generation spec

These images back the `/catalog` page. Each is a **body-type mockup** (not an exact model).
The app overlays clickable hotspots on top using **percentage coordinates**, so every image
MUST follow the same framing or the hotspots won't line up.

## Folder / filename layout (16 images total)

```
public/cars/
  sedan/   front.png  rear.png  left.png  right.png
  suv/     front.png  rear.png  left.png  right.png
  pickup/  front.png  rear.png  left.png  right.png
  van/     front.png  rear.png  left.png  right.png
```

- Format: **PNG with transparent background** (no scene, no floor).
- Canvas: **1600 × 1200 px (4:3), same for every image.**
- The app shows them at 4:3 and object-cover, so keep the car inside a safe area.

## Framing rules (critical — keep identical across all 16)

- **One vehicle, centered**, both horizontally and vertically.
- Car fills about **85% of the width** for front/rear, **90%** for left/right.
- **Orthographic / straight-on** views (no 3/4 perspective, no tilt):
  - `front` = dead-on front, `rear` = dead-on rear.
  - `left` = pure side profile, **front of car pointing LEFT**.
  - `right` = pure side profile, **front of car pointing RIGHT** (mirror of left).
- **Neutral silver-grey car**, clean studio lighting, soft or no shadow.
- **No brand logos, no license plate text, no people, no background.**
- Keep wheels/tyres visible at the bottom on side views.

## Prompt template (use with ChatGPT image / Midjourney / etc.)

Base:
> "Studio product illustration of a generic {BODY}, {ANGLE} view, orthographic straight-on,
> centered, neutral silver-grey paint, soft even lighting, **transparent background**,
> no logos, no license plate, no people, clean and simple, 4:3."

Fill `{BODY}` / `{ANGLE}`:

| {BODY} | {ANGLE} values |
|---|---|
| four-door **sedan** | front view / rear view / left side profile (front facing left) / right side profile (front facing right) |
| compact **SUV** | (same four angles) |
| **pickup truck** (double cab) | (same four angles) |
| **passenger van / MPV** | (same four angles) |

Example (sedan, left):
> "Studio product illustration of a generic four-door sedan, left side profile with the front
> of the car facing left, orthographic straight-on, centered, neutral silver-grey paint, soft
> even lighting, transparent background, no logos, no license plate, no people, 4:3."

## After you generate

1. Drop each file into the matching folder with the exact name above.
2. Tell me — I'll open them and fine-tune the hotspot positions to match each image.

Until images are added, the page shows a neutral placeholder silhouette (still clickable).
