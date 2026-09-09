import { RiskForecast, RiskLevel, RiskAssessment } from '../types/risk';
import {
  RoadNode,
  RoadEdge,
  RoadNetworkGraph,
  RoutingMode,
  RouteSegment,
  RouteResult,
  RoutePairResult,
  RouteRiskExposure,
  AvoidedHazardSegment,
} from '../types/routing';
import { PROTOTYPE_ROAD_GRAPH } from '../mock/roadNetwork';

/**
 * Returns penalty multiplier and blocking status for a road edge given its flood conditions and routing mode.
 */
export function calculateEdgeCostMultiplier(
  riskLevel: RiskLevel,
  depth_cm: number,
  mode: RoutingMode,
  isElevated: boolean = false
): { multiplier: number; isBlocked: boolean; reason?: string } {
  // If road is elevated (e.g. Bandra-Worli Sea Link or Eastern Freeway Viaduct),
  // it is raised above surface street water inundation.
  if (isElevated) {
    return { multiplier: mode === 'EMERGENCY' ? 0.85 : 1.0, isBlocked: false };
  }

  // Any street with CRITICAL risk or depth >= 100cm is completely impassable/blocked in all modes
  if (riskLevel === 'CRITICAL' || depth_cm >= 100) {
    return {
      multiplier: Infinity,
      isBlocked: true,
      reason: `Critical flood inundation (${depth_cm.toFixed(1)} cm) - road completely impassable`,
    };
  }

  if (mode === 'EMERGENCY') {
    // High-clearance emergency vehicles (ambulances, fire tenders, rescue trucks)
    // Physical wading limit is 50 cm. Any depth >= 50 cm is blocked for vehicle safety.
    if (depth_cm >= 50) {
      return {
        multiplier: Infinity,
        isBlocked: true,
        reason: `Hazardous water depth (${depth_cm.toFixed(1)} cm) exceeds emergency vehicle wading limit (50 cm)`,
      };
    }
    if (riskLevel === 'VERY_HIGH' || depth_cm >= 30) {
      return { multiplier: 3.5, isBlocked: false };
    }
    if (riskLevel === 'HIGH' || depth_cm >= 20) {
      return { multiplier: 2.0, isBlocked: false };
    }
    if (riskLevel === 'MODERATE' || depth_cm >= 5) {
      return { multiplier: 1.2, isBlocked: false };
    }
    // LOW risk: Priority transit with emergency sirens
    return { multiplier: 0.85, isBlocked: false };
  }

  if (mode === 'SAFEST') {
    // Commuter safety priority: aggressive diversion away from flood waters
    if (depth_cm >= 50) {
      return {
        multiplier: 200.0,
        isBlocked: false,
        reason: `Severe flood depth (${depth_cm.toFixed(1)} cm) - highly penalized`,
      };
    }
    if (riskLevel === 'VERY_HIGH') {
      return { multiplier: 100.0, isBlocked: false };
    }
    if (riskLevel === 'HIGH' || depth_cm >= 20) {
      return { multiplier: 30.0, isBlocked: false };
    }
    if (riskLevel === 'MODERATE' || depth_cm >= 5) {
      return { multiplier: 5.0, isBlocked: false };
    }
    return { multiplier: 1.0, isBlocked: false };
  }

  // FASTEST mode: Commuters balancing travel time and manageable shallow water
  if (depth_cm >= 50) {
    return { multiplier: 15.0, isBlocked: false };
  }
  if (riskLevel === 'VERY_HIGH') {
    return { multiplier: 8.0, isBlocked: false };
  }
  if (riskLevel === 'HIGH' || depth_cm >= 20) {
    return { multiplier: 3.5, isBlocked: false };
  }
  if (riskLevel === 'MODERATE' || depth_cm >= 5) {
    return { multiplier: 1.4, isBlocked: false };
  }
  return { multiplier: 1.0, isBlocked: false };
}

/**
 * Evaluates an edge's current flood status from the horizon's RiskAssessments.
 */
export function getEdgeFloodStatus(
  edge: RoadEdge,
  assessments: RiskAssessment[]
): { depth_cm: number; risk_level: RiskLevel; reason?: string } {
  if (edge.is_elevated) {
    return { depth_cm: 0, risk_level: 'LOW', reason: 'Elevated viaduct / bridge above surface water' };
  }

  const match = assessments.find((a) => a.cellId === edge.catchment_cell_id);
  if (!match) {
    return { depth_cm: 0, risk_level: 'LOW' };
  }

  return {
    depth_cm: Math.max(0, match.depth_cm),
    risk_level: match.riskLevel,
    reason: match.reasons.length > 0 ? match.reasons[0] : undefined,
  };
}

interface DirectedEdge {
  edge: RoadEdge;
  fromNodeId: string;
  toNodeId: string;
  cost: number;
  baseTravelTimeS: number;
  effectiveTravelTimeS: number;
  depth_cm: number;
  risk_level: RiskLevel;
  multiplier: number;
  isBlocked: boolean;
}

/**
 * Builds adjacency map with evaluated flood costs for Dijkstra pathfinding.
 */
function buildAdjacency(
  graph: RoadNetworkGraph,
  assessments: RiskAssessment[],
  mode: RoutingMode,
  penalizedEdgeIds: Set<string> = new Set()
): Map<string, DirectedEdge[]> {
  const adj = new Map<string, DirectedEdge[]>();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  for (const edge of graph.edges) {
    const flood = getEdgeFloodStatus(edge, assessments);
    const { multiplier, isBlocked } = calculateEdgeCostMultiplier(
      flood.risk_level,
      flood.depth_cm,
      mode,
      edge.is_elevated
    );

    const baseTravelTimeS = edge.distance_m / ((edge.base_speed_kmh * 1000) / 3600);
    const penaltyBonus = penalizedEdgeIds.has(edge.id) ? 2.5 : 1.0;
    const cost = isBlocked ? Infinity : baseTravelTimeS * multiplier * penaltyBonus;
    const effectiveTravelTimeS = isBlocked ? Infinity : baseTravelTimeS * multiplier;

    // Directed transition: source -> target
    const dirA: DirectedEdge = {
      edge,
      fromNodeId: edge.source,
      toNodeId: edge.target,
      cost,
      baseTravelTimeS,
      effectiveTravelTimeS,
      depth_cm: flood.depth_cm,
      risk_level: flood.risk_level,
      multiplier,
      isBlocked,
    };
    adj.get(edge.source)?.push(dirA);

    // If bidirectional, add reverse target -> source
    if (edge.bidirectional) {
      const dirB: DirectedEdge = {
        edge,
        fromNodeId: edge.target,
        toNodeId: edge.source,
        cost,
        baseTravelTimeS,
        effectiveTravelTimeS,
        depth_cm: flood.depth_cm,
        risk_level: flood.risk_level,
        multiplier,
        isBlocked,
      };
      adj.get(edge.target)?.push(dirB);
    }
  }

  return adj;
}

const RISK_RANK: Record<RiskLevel, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  VERY_HIGH: 4,
  CRITICAL: 5,
};

/**
 * Generates an engineering and commuter explanation for the selected route.
 */
function generateRouteExplanation(
  mode: RoutingMode,
  status: 'FOUND' | 'NO_SAFE_ROUTE' | 'ORIGIN_EQUALS_DESTINATION',
  maxDepthCm: number,
  highestRisk: RiskLevel,
  avoidedSegments: AvoidedHazardSegment[],
  _segments: RouteSegment[]
): string {
  if (status === 'ORIGIN_EQUALS_DESTINATION') {
    return 'Origin and destination are the same location. Zero travel required.';
  }

  if (status === 'NO_SAFE_ROUTE') {
    const reasons = avoidedSegments.slice(0, 3).map((s) => `${s.name} (${s.depth_cm.toFixed(0)}cm, ${s.risk_level})`);
    return `No passable route found under ${mode} navigation criteria. Major corridors are impassable due to severe waterlogging: ${reasons.join(', ')}.`;
  }

  const avoidsText =
    avoidedSegments.length > 0
      ? ` Successfully diverted around ${avoidedSegments.length} flood-prone chokepoint(s) including ${avoidedSegments[0].name} (${avoidedSegments[0].depth_cm.toFixed(0)} cm, ${avoidedSegments[0].risk_level}).`
      : ' All traversed road links maintain dry or low-hazard conditions.';

  if (mode === 'SAFEST') {
    if (maxDepthCm === 0) {
      return `Optimal flood-free route selected.${avoidsText}`;
    }
    return `Safest route prioritized minimal surface water exposure (maximum depth ${maxDepthCm.toFixed(1)} cm, ${highestRisk} hazard).${avoidsText}`;
  }

  if (mode === 'EMERGENCY') {
    return `Emergency response transit corridor optimized for rapid arrival.${avoidsText} Maximum water wading depth along corridor: ${maxDepthCm.toFixed(1)} cm.`;
  }

  return `Fastest transit corridor selected.${avoidsText} Maximum flood depth along route: ${maxDepthCm.toFixed(1)} cm.`;
}

/**
 * Core Dijkstra pathfinding algorithm.
 */
function dijkstra(
  originId: string,
  destinationId: string,
  graph: RoadNetworkGraph,
  assessments: RiskAssessment[],
  mode: RoutingMode,
  penalizedEdgeIds: Set<string> = new Set()
): {
  success: boolean;
  path: DirectedEdge[];
  nodeSequence: string[];
  allAvoidedHazards: AvoidedHazardSegment[];
} {
  const adj = buildAdjacency(graph, assessments, mode, penalizedEdgeIds);

  // Identify network-wide flooded hazard segments for the avoidance report
  const allAvoidedHazards: AvoidedHazardSegment[] = [];
  for (const edge of graph.edges) {
    const flood = getEdgeFloodStatus(edge, assessments);
    if (flood.risk_level === 'HIGH' || flood.risk_level === 'VERY_HIGH' || flood.risk_level === 'CRITICAL') {
      allAvoidedHazards.push({
        edge_id: edge.id,
        name: edge.name,
        risk_level: flood.risk_level,
        depth_cm: flood.depth_cm,
        reason: flood.reason || `Surface flood depth ${flood.depth_cm.toFixed(1)} cm`,
      });
    }
  }

  const dist = new Map<string, number>();
  const prevNode = new Map<string, string>();
  const prevEdge = new Map<string, DirectedEdge>();
  const visited = new Set<string>();

  for (const node of graph.nodes) {
    dist.set(node.id, Infinity);
  }
  dist.set(originId, 0);

  while (visited.size < graph.nodes.length) {
    // Find unvisited node with minimum distance
    let u: string | null = null;
    let minDist = Infinity;

    for (const [nodeId, d] of dist.entries()) {
      if (!visited.has(nodeId) && d < minDist) {
        minDist = d;
        u = nodeId;
      }
    }

    if (!u || minDist === Infinity) break;
    if (u === destinationId) break;

    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.toNodeId) || edge.isBlocked) continue;

      const alt = dist.get(u)! + edge.cost;
      if (alt < dist.get(edge.toNodeId)!) {
        dist.set(edge.toNodeId, alt);
        prevNode.set(edge.toNodeId, u);
        prevEdge.set(edge.toNodeId, edge);
      }
    }
  }

  if (dist.get(destinationId) === Infinity || !prevNode.has(destinationId)) {
    return {
      success: false,
      path: [],
      nodeSequence: [],
      allAvoidedHazards,
    };
  }

  // Reconstruct path
  const path: DirectedEdge[] = [];
  const nodeSequence: string[] = [destinationId];
  let curr = destinationId;

  while (curr !== originId) {
    const pEdge = prevEdge.get(curr)!;
    path.unshift(pEdge);
    curr = prevNode.get(curr)!;
    nodeSequence.unshift(curr);
  }

  return {
    success: true,
    path,
    nodeSequence,
    allAvoidedHazards,
  };
}

/**
 * Builds a comprehensive RouteResult object from a solved path.
 */
function formatRouteResult(
  origin: RoadNode,
  destination: RoadNode,
  mode: RoutingMode,
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3',
  path: DirectedEdge[],
  nodeSequence: string[],
  allAvoidedHazards: AvoidedHazardSegment[],
  nodeMap: Map<string, RoadNode>,
  isAlternative: boolean = false
): RouteResult {
  if (origin.id === destination.id) {
    return {
      status: 'ORIGIN_EQUALS_DESTINATION',
      mode,
      horizon,
      origin,
      destination,
      total_distance_m: 0,
      total_distance_km: 0,
      total_time_s: 0,
      total_time_min: 0,
      max_flood_depth_cm: 0,
      highest_risk_level: 'LOW',
      segments: [],
      path_node_ids: [origin.id],
      coordinates: [[origin.lat, origin.lng]],
      risk_exposure: { low_m: 0, moderate_m: 0, high_m: 0, very_high_m: 0, critical_m: 0 },
      avoided_segments: [],
      explanation: generateRouteExplanation(mode, 'ORIGIN_EQUALS_DESTINATION', 0, 'LOW', [], []),
      is_alternative: isAlternative,
      provenance: 'MODEL OUTPUT / DERIVED',
    };
  }

  if (path.length === 0) {
    return {
      status: 'NO_SAFE_ROUTE',
      mode,
      horizon,
      origin,
      destination,
      total_distance_m: 0,
      total_distance_km: 0,
      total_time_s: 0,
      total_time_min: 0,
      max_flood_depth_cm: 0,
      highest_risk_level: 'CRITICAL',
      segments: [],
      path_node_ids: [],
      coordinates: [],
      risk_exposure: { low_m: 0, moderate_m: 0, high_m: 0, very_high_m: 0, critical_m: 0 },
      avoided_segments: allAvoidedHazards,
      explanation: generateRouteExplanation(mode, 'NO_SAFE_ROUTE', 0, 'CRITICAL', allAvoidedHazards, []),
      is_alternative: isAlternative,
      provenance: 'MODEL OUTPUT / DERIVED',
    };
  }

  let total_distance_m = 0;
  let total_time_s = 0;
  let max_flood_depth_cm = 0;
  let highest_risk_level: RiskLevel = 'LOW';

  const risk_exposure: RouteRiskExposure = {
    low_m: 0,
    moderate_m: 0,
    high_m: 0,
    very_high_m: 0,
    critical_m: 0,
  };

  const segments: RouteSegment[] = [];
  const consolidatedCoordinates: [number, number][] = [];
  const traversedEdgeIds = new Set<string>();

  for (let i = 0; i < path.length; i++) {
    const dEdge = path[i];
    const edge = dEdge.edge;
    traversedEdgeIds.add(edge.id);

    total_distance_m += edge.distance_m;
    total_time_s += dEdge.effectiveTravelTimeS;

    if (dEdge.depth_cm > max_flood_depth_cm) {
      max_flood_depth_cm = dEdge.depth_cm;
    }

    if (RISK_RANK[dEdge.risk_level] > RISK_RANK[highest_risk_level]) {
      highest_risk_level = dEdge.risk_level;
    }

    // Accumulate risk exposure distance
    switch (dEdge.risk_level) {
      case 'LOW':
        risk_exposure.low_m += edge.distance_m;
        break;
      case 'MODERATE':
        risk_exposure.moderate_m += edge.distance_m;
        break;
      case 'HIGH':
        risk_exposure.high_m += edge.distance_m;
        break;
      case 'VERY_HIGH':
        risk_exposure.very_high_m += edge.distance_m;
        break;
      case 'CRITICAL':
        risk_exposure.critical_m += edge.distance_m;
        break;
    }

    // Determine segment coordinates in the correct travel direction
    let segCoords: [number, number][] = [...edge.coordinates];
    if (dEdge.fromNodeId !== edge.source) {
      // Reverse coordinates if traversing against nominal edge direction
      segCoords = [...edge.coordinates].reverse();
    }

    // Append coordinates avoiding duplicate junction points
    for (let j = 0; j < segCoords.length; j++) {
      if (consolidatedCoordinates.length === 0 || j > 0) {
        consolidatedCoordinates.push(segCoords[j]);
      }
    }

    const fromNode = nodeMap.get(dEdge.fromNodeId)!;
    const toNode = nodeMap.get(dEdge.toNodeId)!;
    const effectiveSpeed = Math.max(5, edge.base_speed_kmh / Math.max(1, dEdge.multiplier));

    segments.push({
      edge_id: edge.id,
      name: edge.name,
      from_node_id: dEdge.fromNodeId,
      to_node_id: dEdge.toNodeId,
      from_node_name: fromNode.name,
      to_node_name: toNode.name,
      distance_m: edge.distance_m,
      base_speed_kmh: edge.base_speed_kmh,
      effective_speed_kmh: Number(effectiveSpeed.toFixed(1)),
      travel_time_s: Math.round(dEdge.effectiveTravelTimeS),
      flood_depth_cm: Number(dEdge.depth_cm.toFixed(1)),
      risk_level: dEdge.risk_level,
      penalty_factor: Number(dEdge.multiplier.toFixed(2)),
      is_blocked: dEdge.isBlocked,
      coordinates: segCoords,
    });
  }

  // Filter avoided hazards to only those not on the selected path
  const relevantAvoided = allAvoidedHazards.filter((h) => !traversedEdgeIds.has(h.edge_id));

  return {
    status: 'FOUND',
    mode,
    horizon,
    origin,
    destination,
    total_distance_m,
    total_distance_km: Number((total_distance_m / 1000).toFixed(2)),
    total_time_s: Math.round(total_time_s),
    total_time_min: Number((total_time_s / 60).toFixed(1)),
    max_flood_depth_cm: Number(max_flood_depth_cm.toFixed(1)),
    highest_risk_level,
    segments,
    path_node_ids: nodeSequence,
    coordinates: consolidatedCoordinates,
    risk_exposure,
    avoided_segments: relevantAvoided,
    explanation: generateRouteExplanation(
      mode,
      'FOUND',
      max_flood_depth_cm,
      highest_risk_level,
      relevantAvoided,
      segments
    ),
    is_alternative: isAlternative,
    provenance: 'MODEL OUTPUT / DERIVED',
  };
}

/**
 * Computes primary flood-safe route and optional alternative route between origin and destination.
 */
export function findRoute(
  originId: string,
  destinationId: string,
  mode: RoutingMode,
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3',
  riskForecast: RiskForecast,
  graph: RoadNetworkGraph = PROTOTYPE_ROAD_GRAPH
): RoutePairResult {
  const nodeMap = new Map<string, RoadNode>(graph.nodes.map((n) => [n.id, n]));
  const origin = nodeMap.get(originId);
  const destination = nodeMap.get(destinationId);

  if (!origin || !destination) {
    throw new Error(`Invalid origin (${originId}) or destination (${destinationId})`);
  }

  const horizonState = riskForecast.horizons[horizon];
  const assessments = horizonState ? horizonState.cellAssessments : [];

  // Primary route calculation
  const primarySolve = dijkstra(originId, destinationId, graph, assessments, mode);
  const primary = formatRouteResult(
    origin,
    destination,
    mode,
    horizon,
    primarySolve.path,
    primarySolve.nodeSequence,
    primarySolve.allAvoidedHazards,
    nodeMap,
    false
  );

  let alternative: RouteResult | undefined = undefined;

  // If primary route exists with at least 1 edge, attempt to compute a distinct alternative route
  if (primary.status === 'FOUND' && primary.segments.length > 0) {
    // Penalize the edges used by the primary route to encourage finding a viable detour
    const primaryEdgeIds = new Set(primary.segments.map((s) => s.edge_id));
    const altSolve = dijkstra(originId, destinationId, graph, assessments, mode, primaryEdgeIds);

    if (altSolve.success && altSolve.path.length > 0) {
      const altResult = formatRouteResult(
        origin,
        destination,
        mode,
        horizon,
        altSolve.path,
        altSolve.nodeSequence,
        altSolve.allAvoidedHazards,
        nodeMap,
        true
      );

      // Verify alternative is physically distinct (not identical edge sequence)
      const altEdgeIds = altResult.segments.map((s) => s.edge_id).join('-');
      const priEdgeIds = primary.segments.map((s) => s.edge_id).join('-');
      if (altEdgeIds !== priEdgeIds) {
        alternative = altResult;
      }
    }
  }

  return {
    primary,
    alternative,
    evaluated_at: new Date().toISOString(),
    horizon,
    mode,
    provenance: 'MODEL OUTPUT / DERIVED',
  };
}
