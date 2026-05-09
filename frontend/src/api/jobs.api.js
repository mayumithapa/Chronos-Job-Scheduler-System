import api from "./axiosClient";

export const jobsApi = {
  list: (params = {}) => api.get("/jobs", { params }).then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data),
  create: (payload) => api.post("/jobs", payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/jobs/${id}`, payload).then((r) => r.data),
  cancel: (id) => api.post(`/jobs/${id}/cancel`).then((r) => r.data),
  pause: (id) => api.post(`/jobs/${id}/pause`).then((r) => r.data),
  resume: (id) => api.post(`/jobs/${id}/resume`).then((r) => r.data),
  reschedule: (id, payload) =>
    api.post(`/jobs/${id}/reschedule`, payload).then((r) => r.data),
  runs: (id, params = {}) =>
    api.get(`/jobs/${id}/runs`, { params }).then((r) => r.data),
};
