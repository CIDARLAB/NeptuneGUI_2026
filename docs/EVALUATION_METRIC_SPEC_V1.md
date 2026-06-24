# Evaluation Metric Specification (V1)

This document defines how each evaluation parameter on the Jobs page is computed.

## Formula

`Evaluation Score = w_area * GlobalUtilization + w_cmpt * LocalCompactness + w_conn * ConnectionLength + w_sym * Symmetry + w_bend * Bend`

Where:

- `w_area`, `w_cmpt`, `w_conn`, `w_sym`, `w_bend` are user-provided weights.
- Recommended weight sum is `1.0`.

All score terms are normalized to `[0, 1]` unless noted otherwise.

---

## Geometry Inputs

Given a routed design JSON:

- `components`: component instances with `params.position`, `x-span`, `y-span`
- `connections`: routed paths with `paths[*].wayPoints`
- `canvas`: from `design.params.width/length` or fallback to `design.params["x-span"]/["y-span"]`

### Point Set For Enclosing Polygon

The enclosing polygon is built from:

1. **Component footprint corner points** (four rectangle corners per component)
2. **Connection waypoint points** (all `paths[*].wayPoints`)

The implementation uses the convex hull of the combined point set.

---

## 1) Global Utilization

Represents how much of the canvas is occupied by the overall routed layout envelope.

1. Compute `HullArea` from the enclosing polygon.
2. Compute `CanvasArea = CanvasWidth * CanvasHeight`.
3. Compute:

`GlobalUtilization = clamp(HullArea / CanvasArea, 0, 1)`

---

## 2) Local Compactness

Represents how tightly components fill the enclosing layout envelope.

1. Compute total component footprint area:

`ComponentArea = Σ (component_x_span * component_y_span)`

2. Reuse `HullArea` from above.
3. Compute:

`LocalCompactness = clamp(ComponentArea / HullArea, 0, 1)`

If `HullArea <= 0`, Local Compactness is set to `0`.

---

## 3) Connection Length

Compares actual routed length against straight-line distance.

1. `RoutedLength`: sum of Euclidean distances between consecutive waypoints along each routed path.
2. `ShortestLength`: sum of straight-line Euclidean distance from path start to path end (per connection path).
3. Compute:

`ConnectionLength = ShortestLength / RoutedLength`

If `RoutedLength <= 0`, Connection Length is set to `0`.

---

## 4) Symmetry

Measures horizontal and vertical mirror consistency of component centers.

1. Compute each component center from position and span.
2. Compute design center `(cx, cy)` from min/max center extents.
3. For each center point, check mirrored match across:
   - vertical axis (`x -> 2*cx - x`)
   - horizontal axis (`y -> 2*cy - y`)
4. Compute:

`Symmetry = (HorizontalMatchRatio + VerticalMatchRatio) / 2`

---

## 5) Bend

Rewards fewer direction changes in routed channels.

1. For each routed path, iterate consecutive waypoint segments.
2. Count a new segment whenever slope category changes (horizontal / vertical / other slope).
3. Let:
   - `NumConnections` = number of connection records
   - `NumSegments` = counted segment groups
4. Compute:

`Bend = NumConnections / NumSegments`

If `NumSegments <= 0`, Bend is set to `0`.

---

## Notes

- The Jobs UI recomputes weighted total in the frontend using current user weights.
- Missing terms default to safe fallback values during normalization to avoid breaking table rendering.
