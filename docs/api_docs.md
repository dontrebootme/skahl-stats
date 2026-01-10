# SportNinja API Documentation

**Base URL**: `https://metal-api.sportninja.net/v1`

## Authentication
The API requires a Bearer token.
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Found in `localStorage` under the key `session_token_iframe` (or sometimes `sn_token`).
- **Token Type**: Likely a JWT or PASETO token (starts with `v2.local.`).
- **Validity**: The token appears to be generated for the browser plugin session.

> [!IMPORTANT]
> Some endpoints (specifically `teams/{id}/rosters`) require the following headers to return data:
> - `Origin: https://snokingahl.com`
> - `Referer: https://snokingahl.com/`
> Without these, the API may return an empty list or 403 Forbidden.

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

### Get Team Roster Contexts (Seasons)
`GET /teams/{teamId}/rosters`
Returns a list of roster objects/seasons.
*   **Key Field**: `id` -> This is the `rosterId`.
*   **Key Field**: `schedule_id` -> Match this to the active season ID.

### Get Team Roster (Players)
`GET /teams/{teamId}/rosters/{rosterId}/players`
Returns the list of players for that specific season/roster.
*   **Fields**: `name`, `jersey_number`, `position`, `id`.

## ID References (Sno King AHL)
- **Organization ID**: `77NV8cZJ8xzsgvjL`
- **Example Game ID**: `U8cKrkcBm2RvgHc0`
- **Example Team ID**: `dF6hiXpCOYlsIStS`
- **Example Roster ID**: `Py3ya0IRlmCy7mOa` (Winter 24-25)
