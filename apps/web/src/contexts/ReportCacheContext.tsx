import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getReportById,
  getReportBySlug,
  getReportConfigs,
  getReportConfig,
  type StoredReport,
  type ReportConfig,
} from '../lib/api';

interface ReportCacheContextType {
  // Reports cache
  reports: Map<string, StoredReport>;
  getReport: (id: string) => StoredReport | undefined;
  getCachedOrFetchReport: (id: string) => Promise<StoredReport>;
  getCachedOrFetchReportBySlug: (slug: string) => Promise<StoredReport>;
  cacheReport: (report: StoredReport) => void;

  // Streams cache
  streams: ReportConfig[];
  streamsLoaded: boolean;
  getStream: (id: string) => ReportConfig | undefined;
  getCachedOrFetchStreams: (forceRefresh?: boolean) => Promise<ReportConfig[]>;
  getCachedOrFetchStream: (id: string) => Promise<ReportConfig>;
  cacheStreams: (streams: ReportConfig[]) => void;
  updateStreamInCache: (stream: ReportConfig) => void;

  // Preloading
  preloadReportsForStream: (streamId: string) => void;
  preloadReport: (reportId: string) => void;

  // Clear cache
  clearCache: () => void;
}

const ReportCacheContext = createContext<ReportCacheContextType | undefined>(undefined);

export function ReportCacheProvider({ children }: { children: ReactNode }) {
  // Reports indexed by both ID and slug for fast lookup
  const [reports, setReports] = useState<Map<string, StoredReport>>(new Map());
  const [slugToId, setSlugToId] = useState<Map<string, string>>(new Map());

  // Streams cache
  const [streams, setStreams] = useState<ReportConfig[]>([]);
  const [streamsLoaded, setStreamsLoaded] = useState(false);
  const [streamDetails, setStreamDetails] = useState<Map<string, ReportConfig>>(new Map());

  // Track in-flight requests to avoid duplicate fetches
  const [pendingReports, setPendingReports] = useState<Map<string, Promise<StoredReport>>>(new Map());
  const [pendingStreams, setPendingStreams] = useState<Promise<ReportConfig[]> | null>(null);

  // Get a report from cache
  const getReport = useCallback((idOrSlug: string): StoredReport | undefined => {
    // Try direct ID lookup
    if (reports.has(idOrSlug)) {
      return reports.get(idOrSlug);
    }
    // Try slug lookup
    const id = slugToId.get(idOrSlug);
    if (id) {
      return reports.get(id);
    }
    return undefined;
  }, [reports, slugToId]);

  // Cache a report (also indexes by slug if available)
  const cacheReport = useCallback((report: StoredReport) => {
    setReports(prev => {
      const next = new Map(prev);
      next.set(report.id, report);
      return next;
    });
    if (report.publicSlug) {
      setSlugToId(prev => {
        const next = new Map(prev);
        next.set(report.publicSlug!, report.id);
        return next;
      });
    }
  }, []);

  // Get from cache or fetch by ID
  const getCachedOrFetchReport = useCallback(async (id: string): Promise<StoredReport> => {
    // Check cache first
    const cached = reports.get(id);
    if (cached) return cached;

    // Check if already fetching
    const pending = pendingReports.get(id);
    if (pending) return pending;

    // Fetch and cache
    const promise = getReportById(id).then(report => {
      cacheReport(report);
      setPendingReports(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return report;
    });

    setPendingReports(prev => new Map(prev).set(id, promise));
    return promise;
  }, [reports, pendingReports, cacheReport]);

  // Get from cache or fetch by slug
  const getCachedOrFetchReportBySlug = useCallback(async (slug: string): Promise<StoredReport> => {
    // Check if we have the ID for this slug
    const id = slugToId.get(slug);
    if (id) {
      const cached = reports.get(id);
      if (cached) return cached;
    }

    // Check if already fetching
    const pending = pendingReports.get(slug);
    if (pending) return pending;

    // Fetch and cache
    const promise = getReportBySlug(slug).then(report => {
      cacheReport(report);
      setPendingReports(prev => {
        const next = new Map(prev);
        next.delete(slug);
        return next;
      });
      return report;
    });

    setPendingReports(prev => new Map(prev).set(slug, promise));
    return promise;
  }, [reports, slugToId, pendingReports, cacheReport]);

  // Streams: get from cache
  const getStream = useCallback((id: string): ReportConfig | undefined => {
    return streamDetails.get(id) || streams.find(s => s.id === id);
  }, [streams, streamDetails]);

  // Cache streams list
  const cacheStreams = useCallback((newStreams: ReportConfig[]) => {
    setStreams(newStreams);
    setStreamsLoaded(true);

    // Also cache any embedded reports
    newStreams.forEach(stream => {
      if (stream.generatedReports) {
        stream.generatedReports.forEach(report => {
          cacheReport(report);
        });
      }
    });
  }, [cacheReport]);

  // Update single stream in cache
  const updateStreamInCache = useCallback((stream: ReportConfig) => {
    setStreams(prev => {
      const idx = prev.findIndex(s => s.id === stream.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stream;
        return next;
      }
      return [...prev, stream];
    });
    setStreamDetails(prev => new Map(prev).set(stream.id, stream));

    // Cache embedded reports
    if (stream.generatedReports) {
      stream.generatedReports.forEach(report => cacheReport(report));
    }
  }, [cacheReport]);

  // Get streams from cache or fetch (forceRefresh bypasses cache)
  const getCachedOrFetchStreams = useCallback(async (forceRefresh = false): Promise<ReportConfig[]> => {
    if (!forceRefresh && streamsLoaded && streams.length > 0) {
      return streams;
    }

    if (pendingStreams) {
      return pendingStreams;
    }

    const promise = getReportConfigs().then(result => {
      cacheStreams(result);
      setPendingStreams(null);
      return result;
    });

    setPendingStreams(promise);
    return promise;
  }, [streams, streamsLoaded, pendingStreams, cacheStreams]);

  // Get single stream from cache or fetch
  const getCachedOrFetchStream = useCallback(async (id: string): Promise<ReportConfig> => {
    const cached = streamDetails.get(id);
    if (cached) return cached;

    const result = await getReportConfig(id);
    updateStreamInCache(result);
    return result;
  }, [streamDetails, updateStreamInCache]);

  // Preload reports for a stream (background, non-blocking)
  const preloadReportsForStream = useCallback((streamId: string) => {
    const stream = getStream(streamId);
    if (!stream?.generatedReports) return;

    // Preload first 5 reports in background
    stream.generatedReports.slice(0, 5).forEach(report => {
      if (!reports.has(report.id)) {
        // Already have basic data, but could fetch full details if needed
        cacheReport(report);
      }
    });
  }, [getStream, reports, cacheReport]);

  // Preload a single report (background)
  const preloadReport = useCallback((reportId: string) => {
    if (reports.has(reportId)) return;

    // Fire and forget - don't await
    getCachedOrFetchReport(reportId).catch(err => {
      console.warn('Failed to preload report:', reportId, err);
    });
  }, [reports, getCachedOrFetchReport]);

  // Clear all cache
  const clearCache = useCallback(() => {
    setReports(new Map());
    setSlugToId(new Map());
    setStreams([]);
    setStreamsLoaded(false);
    setStreamDetails(new Map());
    setPendingReports(new Map());
    setPendingStreams(null);
  }, []);

  return (
    <ReportCacheContext.Provider
      value={{
        reports,
        getReport,
        getCachedOrFetchReport,
        getCachedOrFetchReportBySlug,
        cacheReport,
        streams,
        streamsLoaded,
        getStream,
        getCachedOrFetchStreams,
        getCachedOrFetchStream,
        cacheStreams,
        updateStreamInCache,
        preloadReportsForStream,
        preloadReport,
        clearCache,
      }}
    >
      {children}
    </ReportCacheContext.Provider>
  );
}

export function useReportCache() {
  const context = useContext(ReportCacheContext);
  if (context === undefined) {
    throw new Error('useReportCache must be used within a ReportCacheProvider');
  }
  return context;
}
