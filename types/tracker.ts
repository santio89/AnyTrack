export type ReferenceImageValue = {
  data: string;
  mimeType: string;
};

export type TrackerMode = "guest" | "cloud";

export type TrackerRecord = {
  id: string;
  dbId?: number;
  mode: TrackerMode;
  url: string;
  targetDescription: string;
  referenceImagePath: string | null;
  referenceImagePaths: string | null;
  referenceImage: ReferenceImageValue | null;
  frequencyMinutes: number;
  sortOrder: number;
  notifyOnChange: boolean;
  notifyOnFailure: boolean;
  notificationEmail: string | null;
  isActive: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LogRecord = {
  id: string;
  dbId?: number;
  trackerId: string;
  extractedValue: string | null;
  confidence: number | null;
  model: string | null;
  error: string | null;
  screenshotPath: string | null;
  screenshotDataUrl: string | null;
  createdAt: string;
  trackerUrl: string | null;
  trackerDescription: string | null;
  mode: TrackerMode;
};

export type GuestTrackerPayload = {
  url: string;
  targetDescription: string;
  frequencyMinutes: number;
  notifyOnChange: boolean;
  notifyOnFailure: boolean;
  notificationEmail: string | null;
  isActive: boolean;
  sortOrder: number;
  referenceImage: ReferenceImageValue | null;
};
