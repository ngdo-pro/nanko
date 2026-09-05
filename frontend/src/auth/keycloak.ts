import Keycloak from 'keycloak-js'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:48080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'nanko',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'nanko-web',
})
