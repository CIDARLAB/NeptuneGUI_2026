# Evaluation Metric Specification (V1)

This document defines how each evaluation parameter on the Jobs page is computed.

## Document Structure

This specification is organized as:

1. Scope and interpretation
2. Weighted formula
3. Geometry inputs
4. Metric-by-metric definitions (1-6)
5. Implementation notes and code entry points

## Scope And Interpretation

This metric is a **layout-quality engineering score** for placed/routed geometry.
It is designed to compare layout outcomes (space usage, routing efficiency, shape
regularity) under a common, reproducible definition.

It is **not** a direct fluid-physics performance score. In particular, it does
not directly model pressure drop, residence-time distribution, mixing kinetics,
biological assay response, or fabrication defects.

## Formula

`Evaluation Score = 0.2*GlobalUtilization + 0.2*LocalCompactness + 0.2*ConnectionLength + 0.2*Bend + 0.1*Symmetry + 0.1*Fragmentation`

Where:

- Neptune default weights are:
  - `w_area = 0.2`
  - `w_cmpt = 0.2`
  - `w_conn = 0.2`
  - `w_bend = 0.2`
  - `w_sym = 0.1`
  - `w_frag = 0.1`
- User-provided weights are still supported; the backend normalizes them if needed.

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

The implementation derives an enclosing four-point quadrilateral from the
combined point set and uses that enclosure area as `HullArea`.

---

## 1) Global Utilization

Represents how much of the canvas is occupied by the overall routed layout envelope.

1. Compute `HullArea` from the enclosing polygon.
2. Compute `CanvasArea = CanvasWidth * CanvasHeight`.
3. Compute:

`GlobalUtilization = clamp(HullArea / CanvasArea, 0, 1)`

---

## 2) Local Compactness

Represents how tightly occupied geometry fills the enclosing layout envelope.

1. Compute total component footprint area:

`ComponentArea = Σ (component_x_span * component_y_span)`

2. Compute total channel area from routed paths:

`ChannelArea = Σ (segment_length * channel_width)`

3. Compute occupied area:

`OccupiedArea = ComponentArea + ChannelArea`

4. Reuse `HullArea` from above and compute:

`LocalCompactness = clamp(OccupiedArea / HullArea, 0, 1)`

If `HullArea <= 0`, Local Compactness is set to `0`.

---

## 3) Connection Length

Compares total endpoint straight-line distance against total routed channel length.

1. `RoutedLength`: sum of Euclidean segment lengths between each pair of adjacent waypoints across **all** routed paths.
2. `ShortestLength`: sum of Euclidean straight-line distances between path start and path end across **all** routed paths.
3. Compute:

`ConnectionLength = ShortestLength / RoutedLength`

If `RoutedLength <= 0`, Connection Length is set to `0`.

Interpretation examples:

- If one port connects to another through a single straight segment, `ConnectionLength = 1`.
- If one routed path contains one right-angle turn and the horizontal/vertical
  leg lengths are equal, `ConnectionLength = 1 / sqrt(2)`.

### ConnectionLength Implementation Standard

To avoid ambiguity, backend Python should follow this procedure exactly:

1. Traverse **all** `connections[*].paths[*]`.
2. For each path:
   - `RoutedLength += sum(distance(waypoint[i], waypoint[i+1]))`
   - `ShortestLength += distance(waypoint[0], waypoint[last])`
3. Return `ConnectionLength = ShortestLength / RoutedLength` when `RoutedLength > 0`.
4. Skip malformed paths (missing/invalid waypoints) without crashing.

Reference pseudocode:

```text
for connection in connections:
  for path in connection.paths:
    wp = valid_waypoints(path.wayPoints)
    if len(wp) < 2:
      continue
    RoutedLength += sum(dist(wp[i], wp[i+1]) for i in range(len(wp)-1))
    ShortestLength += dist(wp[0], wp[-1])

ConnectionLength = 0 if RoutedLength <= 0 else ShortestLength / RoutedLength
```

---

## 4) Bend

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

## 5) Symmetry

Measures horizontal and vertical mirror consistency of component centers.

1. Compute each component center from position and span.
2. Compute design center `(cx, cy)` from min/max center extents.
3. For each center point, check mirrored match across:
   - vertical axis (`x -> 2*cx - x`)
   - horizontal axis (`y -> 2*cy - y`)
4. Compute:

`Symmetry = (HorizontalMatchRatio + VerticalMatchRatio) / 2`

---

## 6) Fragmentation

Penalizes disconnected layout topology (scattered "islands").

1. Build a graph where each component is a node.
2. Add an undirected edge when a routed connection links source/sink components.
3. Count connected components in the graph:

`NumIslands = number of connected components`

4. Compute:

`Fragmentation = clamp(1 / NumIslands, 0, 1)`

So:
- one connected island -> `1.0`
- two islands -> `0.5`
- three islands -> `0.333...`

---

## Notes

- Evaluation term computation is performed in backend Python (`Neptune_2026`).
- The Jobs UI only recomputes weighted total in the frontend using current user weights.
- Missing terms default to safe fallback values during normalization to avoid breaking table rendering.
- If provided weights do not sum to `1`, weights are normalized proportionally
  before computing the weighted total.

## Backend-Frontend Execution Split

To avoid divergence, Neptune follows this split:

- **Backend (`Neptune_2026`)** computes all metric terms.
- **Frontend (`NeptuneGUI_2026`)** performs only weighted total recomputation
  when users adjust text-box weights.

Primary backend implementation file:

- `Neptune_2026/fluigi/evaluation_metric.py`

Primary GUI integration file:

- `NeptuneGUI_2026/src/views/dashboard/Solutions.vue`

## Open-Source Customization (DIY)

Users who want custom evaluation formulas should modify backend Python code and
run a local deployment.

Suggested workflow:

1. Clone both repositories locally (`Neptune_2026`, `NeptuneGUI_2026`).
2. Edit evaluation logic in `Neptune_2026/fluigi/evaluation_metric.py`.
3. Start local services and connect GUI to local backend.
4. Validate updated behavior from the Jobs page.

Because Neptune is open source, users are free to fork and maintain their own
evaluation variant in local deployments.
