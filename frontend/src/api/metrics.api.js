import api from "./axiosClient";

export const metricsApi = {
  overview: () => api.get("/metrics").then((r) => r.data),
  recentRuns: (params = {}) =>
    api.get("/metrics/runs", { params }).then((r) => r.data),
  health: () => api.get("/health").then((r) => r.data),
};
