export interface StationMetadata {
  id: string;
  estacao: string;
  municipio: string;
  provider: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  status?: "operacional" | "standby" | "inoperante";
}

export interface LogicalLayer {
  id: string;
  title: string;
  description?: string;
}

export interface FlowConnector {
  id: string;
  from: string;
  to: string;
  label?: string;
  emphasis?: "primary" | "secondary" | "alert";
}

export interface ContainerBoundary {
  id: string;
  title: string;
  scope: "externo" | "backend" | "frontend";
}

export interface EtlStepDescriptor {
  id: string;
  title: string;
  subtitle?: string;
  moduleRef?: string;
}

export interface SequenceActor {
  id: string;
  title: string;
}

export interface SequenceMessage {
  id: string;
  from: string;
  to: string;
  description: string;
}

export interface SequenceAltBranch {
  id: string;
  title: string;
  description: string;
}

export interface EtlRunSample {
  id: string;
  date: string;
  p50: number;
  p95: number;
  p99: number;
  reconsolidated?: boolean;
}

export interface DailyEt0Sample {
  id: string;
  stationId: string;
  date: string;
  value: number;
}

export interface MonthlySummary {
  month: string;
  mean: number;
  q1: number;
  q3: number;
}

export interface ApiLatencyStat {
  route: string;
  min: number;
  p50: number;
  p95: number;
  p99: number;
  q1: number;
  q3: number;
  max: number;
  samples: number;
}

export interface PanelCardSnapshot {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  status?: "ok" | "degradado" | "alerta";
}

export interface PanelChartSeries {
  id: string;
  label: string;
  color: string;
  points: Array<{ x: string; y: number }>; // timestamps ISO
}

export interface PanelSnapshotMetadata {
  station: string;
  collectedAt: string;
}

export interface PipelineStage {
  id: string;
  title: string;
  description?: string;
  moduleRef?: string;
}
