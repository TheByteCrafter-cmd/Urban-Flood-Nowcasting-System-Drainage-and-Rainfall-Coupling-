export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';

export type AlertType = 
  | 'FLOOD_DEPTH' 
  | 'DRAINAGE_SURCHARGE' 
  | 'PIPE_OVER_CAPACITY' 
  | 'CRITICAL_FLOOD_RISK';

export type AlertSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' | 'CRITICAL';

export interface RiskColorMap {
  LOW: string;
  MODERATE: string;
  HIGH: string;
  VERY_HIGH: string;
  CRITICAL: string;
}

export const RISK_COLORS: RiskColorMap = {
  LOW: '#10b981',       // Emerald green
  MODERATE: '#f59e0b',  // Amber yellow
  HIGH: '#f97316',      // Orange
  VERY_HIGH: '#ef4444', // Red
  CRITICAL: '#7c3aed'   // Purple
};

export interface RiskAssessment {
  cellId: string;
  row: number;
  col: number;
  zoneName: string;
  depth_cm: number;
  depth_m: number;
  riskLevel: RiskLevel;
  depthCategory: RiskLevel;
  color: string;
  surcharge_m3: number;
  surcharge_m3s: number;
  hasDrainageNode: boolean;
  drainageNodeStatus?: 'NORMAL' | 'WATCH' | 'SURCHARGE' | 'OVERFLOW';
  pipeOverCapacity: boolean;
  reasons: string[];
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  horizonHours: 0 | 1 | 2 | 3;
  title: string;
  description: string;
  location: string;
  cellId?: string;
  nodeId?: string;
  pipeId?: string;
  metricValue: number;
  metricUnit: string;
  timestamp: string;
  provenance: 'MODEL OUTPUT / DERIVED';
}

export interface HorizonRiskState {
  horizon: 'T+0' | 'T+1' | 'T+2' | 'T+3';
  horizonHours: 0 | 1 | 2 | 3;
  timestamp: string;
  cellAssessments: RiskAssessment[];
  highestRisk: RiskLevel;
  riskCounts: Record<RiskLevel, number>;
  alerts: Alert[];
  surchargedNodeCount: number;
  overflowNodeCount: number;
  overCapacityPipeCount: number;
  criticalCellCount: number;
  highOrVeryHighCellCount: number;
  provenance: 'MODEL OUTPUT / DERIVED';
}

export interface RiskForecast {
  generatedAt: string;
  currentRisk: RiskLevel;
  highestRiskAcrossAllHorizons: RiskLevel;
  horizons: Record<'T+0' | 'T+1' | 'T+2' | 'T+3', HorizonRiskState>;
  allAlerts: Alert[];
  provenance: 'MODEL OUTPUT / DERIVED';
}
