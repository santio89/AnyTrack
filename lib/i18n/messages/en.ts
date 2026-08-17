export const en = {
  common: {
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    delete: "Delete",
    deleting: "Deleting...",
    clearing: "Clearing...",
    creating: "Creating...",
    remove: "Remove",
    never: "Never",
    dash: "-",
    close: "Close",
    trackerNumber: "Tracker #{{id}}",
  },
  language: {
    label: "Language",
    english: "English",
    spanish: "Español",
  },
  theme: {
    toggle: "Toggle theme",
    switchToLight: "Switch to light mode",
    switchToDark: "Switch to dark mode",
  },
  auth: {
    signIn: "Sign in",
    signInToSync: "Sign in to sync",
  },
  landing: {
    webMonitor: "AI-powered web monitoring",
    badge: "AI-powered web monitoring",
    titleBefore: "Track any value on the",
    titleHighlight: "live web",
    description:
      "Point AnyTrack at a URL, describe what to watch, and let vision AI capture changes on your schedule.",
    openDashboard: "Open dashboard",
    featureVision: "AI vision extraction",
    featureSchedule: "Scheduled monitoring",
    featureAlerts: "Change alerts",
    previewLive: "Live extraction",
    previewSuccess: "Success",
    previewJustNow: "Just now",
    previewScreenshot: "Screenshot",
    previewExtract: "Extract",
    previewAlert: "Alert",
    previewExamples: {
      google: {
        domain: "google.com/finance",
        value: "GOOGL at $178.32",
      },
      amazon: {
        domain: "amazon.com",
        value: "Sony WH-1000XM5 at $298.00",
      },
      wsj: {
        domain: "wsj.com",
        value: "S&P 500 rises 0.8% as megacap tech leads rally",
      },
      apple: {
        domain: "apple.com",
        value: "iPhone 16 Pro from $999",
      },
    },
  },
  guest: {
    title: "Guest mode",
    description:
      "Trackers and logs are stored in this browser only. Sign in for scheduled monitoring, email alerts, and cloud sync.",
    syncTitle: "Sync local trackers?",
    syncDescription:
      "You have trackers saved in this browser from guest mode. Import them into your account to enable scheduled monitoring and keep them across devices.",
    notNow: "Not now",
    import: "Import to my account",
    syncing: "Syncing...",
    imported: "Local trackers imported to your account",
  },
  header: {
    subtitle: "AI-powered web monitoring",
    addTracker: "Add tracker",
    settings: "Settings",
  },
  settings: {
    title: "Settings",
    description: "Language, appearance, and AI configuration.",
    language: "Language",
    appearance: "Appearance",
    themeLight: "Light",
    themeDark: "Dark",
    ai: "AI",
  },
  dashboard: {
    stats: {
      activeTrackers: "Active Trackers",
      totalTrackers: "Total Trackers",
      successRate: "Success Rate",
    },
    trackers: {
      title: "Your Trackers",
      subtitle: "Monitor websites on a schedule with AI-powered extraction",
      addTracker: "Add Tracker",
      emptyTitle: "No trackers yet",
      emptyDescription:
        "Create your first tracker to start monitoring websites and extracting structured data automatically.",
      createTitle: "Create Tracker",
      createDescription:
        "Add a URL and describe what to extract. English or Spanish both work. Optionally attach a reference screenshot to show the AI which element you mean.",
      editTitle: "Edit Tracker",
      editDescription:
        "Update the URL, extraction prompt, frequency, or reference screenshot.",
      targetUrl: "Target URL",
      urlPlaceholder: "https://example.com/pricing",
      whatToExtract: "What to extract",
      extractPlaceholder: "e.g. El precio actual del producto",
      aiSuggest: "AI suggest",
      checkFrequency: "Check frequency",
      guestFrequency:
        "Manual runs only in guest mode. Sign in to schedule automatic checks.",
      createTracker: "Create Tracker",
      saveChanges: "Save changes",
      dragToReorder: "Drag to reorder",
      frequency: "Frequency",
      lastRun: "Last run",
      manualOnly: "Manual only",
      local: "Local",
      active: "Active",
      paused: "Paused",
      schedulingRequiresSignIn: "Scheduling requires sign in",
      pause: "Pause",
      resume: "Resume",
      pauseTracker: "Pause tracker",
      resumeTracker: "Resume tracker",
      runNow: "Run now",
      runVisibleBrowser: "Run with visible browser",
      editTracker: "Edit tracker",
      deleteTracker: "Delete tracker",
      previousTrackers: "Previous trackers",
      nextTrackers: "Next trackers",
    },
    logs: {
      title: "Extraction Logs",
      subtitle: "Historical results",
      allTrackers: "All trackers",
      clearLogs: "Clear logs",
      refresh: "Refresh logs",
      emptyAll:
        "No logs yet. Logs will appear after the first run.",
      emptyFiltered: "No logs for this tracker yet.",
      time: "Time",
      screenshot: "Screenshot",
      target: "Target",
      extractedValue: "Extracted Value",
      status: "Status",
      detailTitle: "Extraction log",
      storage: "Storage",
      storageGuest: "Local (guest)",
      storageCloud: "Cloud",
      trackerUrl: "Tracker URL",
      model: "Model",
      modelWithProvider: "{{model}} (via {{provider}})",
      logId: "Log ID",
      error: "Error",
      clickToEnlarge: "Click to enlarge",
      scrapeScreenshot: "Extraction screenshot",
      viewScreenshot: "View screenshot for {{label}}",
      screenshotFor: "Screenshot for {{label}}",
      fullScreenshotFor: "Full screenshot for {{label}}",
      clearAllTitle: "Clear all logs?",
      clearTrackerTitle: 'Clear logs for "{{name}}"?',
      clearAllDescription:
        "This will permanently delete all extraction logs and their saved screenshots. Your trackers will not be affected.",
      clearTrackerDescription:
        "This will permanently delete extraction logs and screenshots for this tracker only. Other trackers and the tracker itself will not be affected.",
      clearAll: "Clear all logs",
      clearTracker: "Clear tracker logs",
    },
    notifications: {
      emailOnChange: "Email me when the value changes",
      emailConfigured:
        "Uses Resend. The first successful run sets the baseline.",
      emailNotConfigured:
        "Resend is not configured. Set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL to enable alerts.",
      notificationEmail: "Notification email",
      emailPlaceholder: "you@example.com",
    },
    referenceImage: {
      label: "Reference screenshot",
      optional: "(optional)",
      remove: "Remove",
      pasteDropClick: "Paste, drop, or click to add a screenshot",
      clickToReplace: "Click or paste to replace",
      previewAlt: "Reference screenshot preview",
    },
    delete: {
      title: "Delete tracker?",
      withLogsBefore: "This will permanently delete",
      withLogsAfter:
        "and all of its extraction logs and screenshots. This cannot be undone.",
      keepLogsBefore: "This will remove",
      keepLogsAfter:
        "from your trackers. Existing extraction logs will stay in history and remain available in the log filter.",
      alsoDeleteLogs: "Also delete extraction logs and screenshots",
      keepHistoryHint:
        "Uncheck to keep this tracker's history after removing it.",
      deleteTracker: "Delete tracker",
    },
  },
  status: {
    error: "Error",
    success: "Success",
    noData: "No data",
    running: "Running",
  },
  aiSettings: {
    title: "AI settings",
    description:
      "Use your own API key for extractions, or rely on AnyTrack's hosted AI. Keys are encrypted at rest for signed-in accounts and kept in this browser for guest mode.",
    provider: "Provider",
    selectProvider: "Select provider",
    openai: "OpenAI",
    openrouter: "OpenRouter",
    gateway: "Vercel AI Gateway",
    providers: {
      openai:
        "Use an OpenAI API key with billing enabled. AnyTrack uses GPT-4o for vision extraction.",
      openrouter:
        "Use an OpenRouter API key. You can use paid models or OpenRouter free models on your account.",
      gateway:
        "Use a Vercel AI Gateway key with vision models such as GPT-4o enabled in your Gateway project.",
    },
    apiKey: "API key",
    savedSuffix: "(saved)",
    enterToReplace: "Enter a new key to replace",
    missingKey: "Select a provider and enter an API key",
    pasteKey: "Paste your API key",
    keepKeyHint:
      "Leave blank to keep the current key. We never show the full key after it is saved.",
    fallback: "Use AnyTrack free fallback when my key fails",
    fallbackConfigured: "Falls back to AnyTrack hosted AI.",
    fallbackNotConfigured:
      "AnyTrack hosted AI is not configured on this server.",
    removeKey: "Remove key",
    saved: "AI settings saved",
    saveFailed: "Failed to save AI settings",
    keyRemoved: "API key removed",
    removeFailed: "Failed to remove API key",
  },
  toast: {
    trackerCreated: "Tracker created",
    signInForScheduling: "Sign in to enable scheduled monitoring",
    trackerPaused: "Tracker paused",
    trackerResumed: "Tracker resumed",
    trackerDeleted: "Tracker deleted",
    trackerArchived:
      "Tracker removed. Its logs are still in history.",
    logsCleared: "Logs cleared",
    trackerUpdated: "Tracker updated",
    scrapeFinished: "Check finished",
    trackerAlreadyRunning: "This tracker is already running",
    visibleScrapeFinished: "Visible browser check finished",
    enterUrlFirst: "Enter a URL first",
    suggestBlocked:
      "This site blocks automated access. Suggestions are based on the URL only.",
    noSuggestions: "No suggestions available for this page",
    suggestFailed: "Could not suggest targets",
  },
} as const;

type DeepStringRecord<T> = T extends string
  ? string
  : { [K in keyof T]: DeepStringRecord<T[K]> };

export type Messages = DeepStringRecord<typeof en>;
