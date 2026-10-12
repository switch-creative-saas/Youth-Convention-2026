import type { ConventionSettings, RecordMetadata } from '@/types';
import { DEFAULT_EVENT, DEFAULT_EVENT_ID, type DataRepository, type RepositoryEntity, type RepositoryRecordMap } from './DataRepository';

const VERSION_KEY = 'mosyf_repository_version';
const CURRENT_EVENT_KEY = 'mosyf_current_event_id';
const SETTINGS_KEY = 'mosyf-convention-settings';
const VERSION = 3;
const KEYS: Record<RepositoryEntity, string> = {
  members: 'mosyf-members', executives: 'mosyf-executives', attendance: 'mosyf-attendance',
  biometricLogs: 'mosyf-biometric-logs', adminActivities: 'mosyf-admin-activities',
  firstTimers: 'mosyf-first-timers', generatedLinks: 'mosyf-generated-links', events: 'mosyf-events',
  bands: 'mosyf-bands', departments: 'mosyf-departments', churchGroups: 'mosyf-church-groups',
  churchLocations: 'mosyf-church-locations', programmes: 'mosyf-programmes', conventionRoles: 'mosyf-convention-roles',
};

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? ('rec-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}
function now() { return new Date().toISOString(); }
const LIST_SEEDS = {
  bands: ['Peniel', 'Judah', 'Zion', 'Ephraim'],
  departments: ['Choir', 'Ushering', 'Media', 'Protocol', 'Drama', 'Prayer', 'Technical', 'Dance', 'Evangelism', 'Welfare', 'Decoration', 'Security', 'Sanitation'],
  churchGroups: ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'],
  churchLocations: ['Main Branch', 'Satellite Branch 1', 'Satellite Branch 2', 'Online Fellowship'],
} as const;

export class LocalStorageRepository implements DataRepository {
  readonly currentEventId: string;
  private readonly listeners = new Set<() => void>();
  constructor() {
    this.currentEventId = window.localStorage.getItem(CURRENT_EVENT_KEY) || DEFAULT_EVENT_ID;
    window.localStorage.setItem(CURRENT_EVENT_KEY, this.currentEventId);
    this.runMigrations();
  }
  list<K extends RepositoryEntity>(entity: K, eventId = this.currentEventId): RepositoryRecordMap[K][] {
    return this.read<K>(entity).filter(record => !eventId || (record as RecordMetadata).eventId === eventId);
  }
  replace<K extends RepositoryEntity>(entity: K, records: RepositoryRecordMap[K][]) {
    const existing = this.read<K>(entity).filter(record => (record as RecordMetadata).eventId !== this.currentEventId);
    this.persist(entity, [...existing, ...records.map(record => this.withMetadata(record))]);
  }
  write<K extends RepositoryEntity>(entity: K, record: Omit<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'> & Partial<Pick<RepositoryRecordMap[K], 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'eventId'>>, createdBy = 'system'): RepositoryRecordMap[K] {
    const next = this.withMetadata(record as RepositoryRecordMap[K], createdBy);
    const records = this.read<K>(entity);
    const index = records.findIndex(item => item.id === next.id);
    if (index === -1) records.push(next); else records[index] = next;
    this.persist(entity, records);
    return next;
  }
  getSettings() {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? this.withMetadata(JSON.parse(raw) as ConventionSettings) : null;
  }
  setSettings(settings: ConventionSettings) {
    const next = this.withMetadata(settings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    this.emit();
    return next;
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  reset() { Object.keys(window.localStorage).filter(key => key.startsWith('mosyf_') || key.startsWith('mosyf-')).forEach(key => window.localStorage.removeItem(key)); this.emit(); }
  private read<K extends RepositoryEntity>(entity: K): RepositoryRecordMap[K][] {
    try { const raw = window.localStorage.getItem(KEYS[entity]); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }
  private persist<K extends RepositoryEntity>(entity: K, records: RepositoryRecordMap[K][]) {
    window.localStorage.setItem(KEYS[entity], JSON.stringify(records));
    this.emit();
  }
  private withMetadata<T extends RecordMetadata & { id?: string }>(record: T, createdBy = record.createdBy || 'system'): T {
    const timestamp = now();
    return { ...record, id: record.id || uuid(), eventId: record.eventId || this.currentEventId, createdAt: record.createdAt || timestamp, updatedAt: timestamp, createdBy } as T;
  }
  private runMigrations() {
    const version = Number(window.localStorage.getItem(VERSION_KEY) || '0');
    if (version < 1) {
      (Object.keys(KEYS) as RepositoryEntity[]).forEach(entity => {
        const records = this.read(entity).map(record => this.withMetadata(record));
        if (records.length) window.localStorage.setItem(KEYS[entity], JSON.stringify(records));
      });
      if (!this.read('events').some(event => event.id === DEFAULT_EVENT_ID)) this.persist('events', [this.withMetadata(DEFAULT_EVENT)]);
      const settings = this.getSettings();
      if (settings) this.setSettings(settings);
      window.localStorage.setItem(VERSION_KEY, String(VERSION));
    }
    if (version < 2) {
      (Object.entries(LIST_SEEDS) as Array<[keyof typeof LIST_SEEDS, readonly string[]]>).forEach(([entity, names]) => {
        if (this.read(entity).length) return;
        this.persist(entity, names.map((name, sortOrder) => this.withMetadata({ id: uuid(), name, active: true, sortOrder })));
      });
      window.localStorage.setItem(VERSION_KEY, String(VERSION));
    }
    if (version < 3 && !this.read('programmes').length) {
      const settings = this.getSettings();
      const programmes = (settings?.sessions ?? []).map((session, sortOrder) => this.withMetadata({
        id: session.id,
        title: session.name,
        description: '',
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.venue,
        active: true,
        sortOrder,
      }));
      if (programmes.length) this.persist('programmes', programmes);
      window.localStorage.setItem(VERSION_KEY, String(VERSION));
    }
  }
  private emit() { this.listeners.forEach(listener => listener()); }
}

export const localStorageRepository = new LocalStorageRepository();
