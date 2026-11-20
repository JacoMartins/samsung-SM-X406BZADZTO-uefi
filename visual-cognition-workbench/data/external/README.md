# External stimuli (optional)

Add licensed photographs or screenshots here and list them in `manifest.json`.
They join the training or assessment pool and receive questions generated from
their annotations; any question whose required fields are missing is skipped.

```json
{
  "images": [
    {
      "id": "kitchen_photo_01",
      "src": "kitchen_photo_01.jpg",
      "pool": "assessment",
      "category": "domestic",
      "annotation": {
        "width": 1920, "height": 1200,
        "setting": "kitchen",
        "objects": ["cat", "table", "window", "teapot"],
        "instances": [
          { "type": "cat", "color": "orange", "salience": "primary", "box": { "x": 820, "y": 640, "w": 260, "h": 180 }, "colorReliable": true, "area": 0.02 }
        ],
        "counts": { "people": 0, "animals": 1, "byType": { "cat": 1 } },
        "atmosphere": ["cozy", "quiet"], "atmosphereContra": ["tense"],
        "lighting": "warm sunset", "lightingKey": "sunset", "timeOfDay": "sunset", "lightQuality": "soft", "colorTemperature": 6,
        "relationships": ["cat sitting on the table"],
        "context": "quiet kitchen at sunset",
        "composition": "rule-of-thirds",
        "focal": { "cell": 4 }
      }
    }
  ]
}
```

Use concept keys from `src/scoring/lexicon.js` for `objects` and `instances[].type`,
and colour names from `src/dataset/palette.js`. Images are letterboxed into the
fixed 16:10 presentation frame. Box coordinates are in the image's own pixels.
`narrative` (happening/before/after/circumstances) and `statements` follow the
same structure as the procedural templates in `src/dataset/templates/`.
