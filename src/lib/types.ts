export type ServiceStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface ServiceCheck {
  id: string;
  name: string;
  status: ServiceStatus;
  uptimePercent: number;
  lastCheck: string;
  lastCheckMs?: number;
}

export interface DayRollup {
  date: string;
  uptime: number;
  checks: number;
  p50?: number;
}

export interface StatusPayload {
  services: ServiceCheck[];
  history: Record<string, DayRollup[]>;
  incidents: Incident[];
  lastUpdated: string;
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  services: string[];
  updates: IncidentUpdate[];
  createdAt: string;
  resolvedAt?: string;
}

export interface IncidentUpdate {
  status: Incident['status'];
  body: string;
  timestamp: string;
}
