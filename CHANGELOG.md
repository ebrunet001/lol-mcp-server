# LoL MCP Server - Historique des modifications

## Actor Apify : EC9IhPoWo8Z4mHPJU
**URL Standby :** `https://scrapmania--lol-mcp-server.apify.actor`
**GitHub :** https://github.com/ebrunet001/lol-mcp-server

---

## v2.0.17 (2026-02-12) - Streamable HTTP only + Claude Desktop fix

Migration vers le pattern officiel Apify (template `ts-mcp-empty`).

### Breaking changes
- **SSE supprime** : les endpoints `/sse` et `/messages` n'existent plus
- **Port** : utilise `APIFY_CONTAINER_PORT` au lieu de `ACTOR_STANDBY_PORT`

### Modifications
- **Streamable HTTP stateless** : nouveau serveur + transport par requête (`sessionIdGenerator: undefined`), pas de gestion de sessions
- **CORS** : ajout du middleware `cors` avec `exposedHeaders: ['Mcp-Session-Id']` pour compatibilite Claude Desktop
- **GET /mcp** et **DELETE /mcp** retournent 405 Method Not Allowed
- **Cleanup automatique** : `transport.close()` et `server.close()` sur `res.on('close')`
- **Imports nettoyés** : suppression de `randomUUID`, `SSEServerTransport`, `isInitializeRequest`, `Transport`
- **Clé Riot API** : configurée en env var secrète sur la version 2.0

### Endpoints (mis à jour)
| Path | Methode | Description |
|---|---|---|
| `/health` | GET | Health check avec status des services |
| `/mcp` | POST | Streamable HTTP MCP (stateless) |
| `/mcp` | GET/DELETE | 405 Method Not Allowed |
| `/tools` | GET | Liste des outils disponibles |
| `/docs` | GET | Documentation markdown |

### URL de connexion Claude Desktop
```
https://scrapmania--lol-mcp-server.apify.actor/mcp?token=<APIFY_TOKEN>
```

---

## v2.0.13 (2026-02-11) - Readiness probe fix

- **Readiness probe Apify** : le handler `/` retourne un simple `200 OK` au lieu de créer une session MCP inutile via SSE
- **Découverte** : le proxy Standby d'Apify ne forwarde PAS les requêtes externes vers `/` (seul le readiness probe interne y accede). L'URL de connexion MCP doit obligatoirement inclure `/sse` ou `/mcp`

## v2.0.12 (2026-02-11) - Debug logging (temporaire)

- Ajout de logs `[REQ]` pour diagnostiquer le routing `/` sur Apify Standby
- Confirmation que le readiness probe d'Apify envoie `GET /` avec le header `x-apify-container-server-readiness-probe`

## v2.0.11 (2026-02-10) - Streamable HTTP + SSE sur root

- **Streamable HTTP** : ajout endpoint `/mcp` (protocole MCP 2025-11-25)
- Tentative de servir SSE sur `/` en plus de `/sse` (ne fonctionne pas a cause du proxy Apify)
- Map `transports` typee `Transport` pour supporter SSE et StreamableHTTP
- Validation du type de transport dans `/messages` (`instanceof SSEServerTransport`)

## v2.0.10 (2026-02-10) - Standby env var support

- Support de la cle API Riot via variable d'environnement `RIOT_API_KEY`
- Demarrage gracieux sans cle API (le serveur demarre mais les outils echouent)
- Detection du mode via `APIFY_META_ORIGIN` au lieu de `ACTOR_STANDBY_PORT`

## v2.0.9 (2026-02-10) - Input & Information pages

- Amelioration du copy des pages Input et Information sur la console Apify
- Cas d'usage detailles pour les utilisateurs

## v2.0.8 (2026-02-10) - Metadata alignment

- Categories mises a jour : AI, MCP_SERVERS, INTEGRATIONS
- `riotApiKey` marque comme required dans le schema d'input
- Alignement actor.json avec la console Apify (titre, description)

## v2.0.7 (2026-02-10) - Setup simplification

- Instructions de setup simplifiees : methode Claude Desktop Connector

## v2.0.6 (2026-02-09) - Cost optimization

- Memoire Standby reduite a 128 MB (etait 256 MB)
- Caches LRU reduits pour minimiser l'empreinte memoire
- Objectif : reduire le cout du Standby mode

## v2.0.5 (2026-02-09) - Security fix

- Token expose supprime du code source
- Fichier proxy ajoute au `.gitignore`

## v2.0.4 (2026-02-09) - README v2

- README mis a jour avec les 13 outils v2.0
- Lien GitHub ajoute
- Documentation des fonctionnalites avancees

## v2.0.0 (2026-02-09) - Consolidation majeure

Consolidation de 3 Actors LoL MCP separees en un seul Actor v2.0 :

### Architecture
- **13 outils MCP** organises en 5 categories
- **Data Dragon** : resolution automatique des noms (champions, items, runes, spells)
- **Cache LRU intelligent** : TTL par type de donnee (30s a 7 jours)
- **Rate limiter** : respect des limites Riot API (20 req/s, 100 req/2min)
- **Multi-langue** : anglais et francais
- **Billing** : tracking pay-per-event par type d'outil

### Outils
| Categorie | Nb | Outils |
|---|---|---|
| Account | 4 | `lol_get_account`, `lol_get_summoner`, `lol_get_ranked`, `lol_get_player_profile` |
| Match | 3 | `lol_get_match_history`, `lol_get_match_details`, `lol_get_match_timeline` |
| Mastery | 1 | `lol_get_champion_mastery` |
| Live Game | 1 | `lol_get_live_game` |
| Analysis | 4 | `lol_analyze_performance`, `lol_analyze_champion`, `lol_get_improvement_tips`, `lol_compare_players` |

### Endpoints
| Path | Methode | Description |
|---|---|---|
| `/health` | GET | Health check avec status des services |
| `/mcp` | POST/GET/DELETE | Streamable HTTP MCP (protocole 2025-11-25) |
| `/sse` | GET | SSE MCP (protocole 2024-11-05) |
| `/messages` | POST | Messages SSE (legacy) |
| `/tools` | GET | Liste des outils disponibles |
| `/docs` | GET | Documentation markdown |

### Stack technique
- TypeScript 5.3, Node.js 20, Express 4.18
- `@modelcontextprotocol/sdk` v1.0.0
- `lru-cache` v10, `zod` v3.22
- Apify Actor Platform (Standby mode)

### Configuration Standby
- Memory : 128 MB
- Idle timeout : 1800s (30 min)
- Max requests/run : 4
- Build : latest

---

## Notes techniques

### Apify Standby - Routing
- Le proxy Standby d'Apify **ne forwarde pas** les requêtes externes vers `/`
- Seul le readiness probe interne (header `x-apify-container-server-readiness-probe`) touche `/`
- L'endpoint MCP doit utiliser le path `/mcp`

### URL de connexion Claude Desktop
```
https://scrapmania--lol-mcp-server.apify.actor/mcp?token=<APIFY_TOKEN>
```

### lru-cache v10
- Ne supporte pas `Infinity` comme TTL, utiliser `1000 * 60 * 60 * 24 * 7` (7 jours)
- TTL doit etre un entier positif

### Apify API
- Logs d'un run : `GET /v2/actor-runs/{runId}/log`
- Items d'un dataset : `GET /v2/datasets/{datasetId}/items`
- Abort d'un run : `POST /v2/actor-runs/{runId}/abort`
