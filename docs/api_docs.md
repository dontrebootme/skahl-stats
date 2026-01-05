# SportNinja API Documentation

**Base URL**: `https://metal-api.sportninja.net/v1`

## Authentication
The API requires a Bearer token.
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Found in `localStorage` under the key `session_token_iframe` (or sometimes `sn_token`).
- **Token Type**: Likely a JWT or PASETO token (starts with `v2.local.`).
- **Validity**: The token appears to be generated for the browser plugin session.

## Endpoints

### Get Game Details
`GET /games/{gameId}`

**Response:**
Returns detailed game info including:
- Score by period
- Goals (time, scorer, assists)
- Penalties (offenses)
- Rosters (home and visiting)
- Officials

**Example:**
```bash
curl -H "Authorization: Bearer <token>" "https://metal-api.sportninja.net/v1/games/U8cKrkcBm2RvgHc0"
```

### Get Team Details
`GET /teams/{teamId}`

### Get Organization Schedules
`GET /organizations/{orgId}/schedules`

**Parameters:**
- `sort`: `starts_at`
- `direction`: `desc`

### Get Team Schedules
`GET /teams/{teamId}/schedules`

## ID References (Sno King AHL)
- **Organization ID**: `77NV8cZJ8xzsgvjL`
- **Example Game ID**: `U8cKrkcBm2RvgHc0`
- **Example Team ID**: `dF6hiXpCOYlsIStS`
