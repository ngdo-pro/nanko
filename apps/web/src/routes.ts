export const routes = {
  projectList: () => "/",
  canvas: (projectId: string) => `/projects/${projectId}`,
  system: (projectId: string, systemId: string) => `/projects/${projectId}/systems/${systemId}`,
  container: (projectId: string, systemId: string, containerId: string) => `/projects/${projectId}/systems/${systemId}/containers/${containerId}`,
  compare: (projectId: string) => `/projects/${projectId}/compare`,
};
