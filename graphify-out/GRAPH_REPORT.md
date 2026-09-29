# Graph Report - .  (2026-09-29)

## Corpus Check
- Corpus is ~40,927 words - fits in a single context window. You may not need a graph.

## Summary
- 661 nodes · 1009 edges · 61 communities (40 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.78)
- Token cost: 3,000 input · 1,200 output

## Community Hubs (Navigation)
- Local Subnet Scanner & Main Window
- ARP/OUI MAC Resolution
- External NPM Dependencies
- Node/Electron TSConfig
- Renderer DOM TSConfig
- SFTP IPC & Service Layer
- Electron Build Tooling Deps
- DNS IPC & Lookup Service
- SFTP Shared Types
- Auto-Update Release Pipeline
- IP Calculator & RFC References
- Package Manifest Metadata
- SSH IPC & Session Service
- SFTP Browser UI Components
- Speedtest HTTP Fallback Engine
- Native Ping Bridge
- App Shell & i18n
- Speedtest Renderer Store
- Password Generator
- Shared App Settings Types
- Ping/Port Page UI
- DNS Shared Types
- Traceroute Page UI
- Ping/Port Shared Types
- Speedtest Main Service
- Speedtest Page UI
- Speedtest Preflight Checks
- Scanner Shared Types
- Traceroute Shared Types
- Speedtest Firewall Warning UI
- DNS Page UI
- Speedtest Shared Types
- WHOIS Lookup Bridge
- SSH Password Prompt UI
- SSH Profile Form UI
- Export Utilities (CSV/JSON)
- IP Calculator Page UI
- SSH Page UI
- App Store (Theme/State)
- Tracer Store
- Preload Bridge API
- Legacy Preload Bridge
- SSH Terminal Component
- Module Placeholder UI
- Password Page UI
- Navigation Store
- Scanner Store
- SSH Store
- Updater Store
- IPC Channel Names
- Port Parsing Utilities
- TSConfig Root
- Vite Config Aliases
- Renderer Env Types
- Network Info Types

## God Nodes (most connected - your core abstractions)
1. `handle()` - 23 edges
2. `compilerOptions` - 19 edges
3. `compilerOptions` - 18 edges
4. `scripts` - 13 edges
5. `registerSftpIpc()` - 13 edges
6. `registerAllIpc()` - 12 edges
7. `registerSshIpc()` - 12 edges
8. `getSettings()` - 12 edges
9. `registerPingIpc()` - 11 edges
10. `registerScannerIpc()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Build & Publish step (npm run publish:win)` --shares_data_with--> `publish: GitHub Releases feed (impuLseUZ/netpulse.uz)`  [INFERRED]
  .github/workflows/release.yml → electron-builder.yml
- `NetPulse Scaffold (Stage 1)` --references--> `Windows targets (portable + NSIS)`  [EXTRACTED]
  DEV.md → electron-builder.yml
- `Module 7: Auto-update` --conceptually_related_to--> `Auto-update feature`  [INFERRED]
  DEV.md → README.md
- `net-ping raw sockets with ping fallback` --conceptually_related_to--> `process.platform adapter for ping/tracert/arp`  [INFERRED]
  README.md → DEV.md
- `Content-Security-Policy connect-src allowlist` --shares_data_with--> `IP Calculator module`  [INFERRED]
  src/renderer/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Auto-update release pipeline (tag push -> build -> publish -> update feed)** — github_workflows_release_release_workflow, electron_builder_publish_github, dev_module7_autoupdate [INFERRED 0.85]
- **NetPulse's six diagnostic/monitoring modules** — readme_network_scanner, readme_route_tracer, readme_ip_calculator, readme_ping_port, readme_dns_lookup, readme_speedtest [EXTRACTED 1.00]
- **Renderer CSP allowlist enabling external diagnostic services** — src_renderer_index_csp, readme_speedtest, readme_dns_lookup [INFERRED 0.75]

## Communities (61 total, 21 thin omitted)

### Community 0 - "Local Subnet Scanner & Main Window"
Cohesion: 0.10
Nodes (43): detectLocalSubnet(), netmaskToPrefix(), createWindow(), platformLabel(), rawSocketsAvailable(), registerAppIpc(), handle(), registerAllIpc() (+35 more)

### Community 1 - "ARP/OUI MAC Resolution"
Cohesion: 0.07
Nodes (41): normalizeMac(), parseArpTable(), readArpTable(), BUILTIN_OUI, vendorForMac(), ParsedPing, parseLoss(), parsePingOutput() (+33 more)

### Community 2 - "External NPM Dependencies"
Cohesion: 0.06
Nodes (35): @cloudflare/speedtest, electron-store, electron-updater, i18next, lucide-react, p-limit, dependencies, @cloudflare/speedtest (+27 more)

### Community 3 - "Node/Electron TSConfig"
Cohesion: 0.07
Nodes (27): electron.vite.config.ts, electron-vite/node, node, src/main/**/*, src/preload/**/*, compilerOptions, baseUrl, composite (+19 more)

### Community 4 - "Renderer DOM TSConfig"
Cohesion: 0.08
Nodes (26): DOM, DOM.Iterable, src/renderer/**/*, compilerOptions, allowSyntheticDefaultImports, baseUrl, composite, esModuleInterop (+18 more)

### Community 5 - "SFTP IPC & Service Layer"
Cohesion: 0.17
Nodes (17): registerSftpIpc(), broadcast(), closeSftp(), deleteEntry(), downloadFile(), formatPermissions(), getKind(), listDirectory() (+9 more)

### Community 6 - "Electron Build Tooling Deps"
Cohesion: 0.08
Nodes (25): autoprefixer, electron, electron-builder, electron-vite, devDependencies, autoprefixer, electron, electron-builder (+17 more)

### Community 7 - "DNS IPC & Lookup Service"
Cohesion: 0.17
Nodes (13): registerDnsIpc(), registerDnsIpc(), dnsLookup(), DnsResolver, makeResolver(), resolveType(), withTimeout(), asStr() (+5 more)

### Community 8 - "SFTP Shared Types"
Cohesion: 0.08
Nodes (23): LocalEntry, LocalListQuery, LocalListResult, SftpDeleteQuery, SftpDownloadQuery, SftpEntry, SftpListQuery, SftpListResult (+15 more)

### Community 9 - "Auto-Update Release Pipeline"
Cohesion: 0.11
Nodes (23): Typed IPC handle() wrapper / IpcResult, Module 7: Auto-update, NetPulse Scaffold (Stage 1), process.platform adapter for ping/tracert/arp, Secure preload bridge (window.netpulse), electron-builder.yml build config, publish: GitHub Releases feed (impuLseUZ/netpulse.uz), ssh2/cpu-features asarUnpack (native SFTP module) (+15 more)

### Community 10 - "IP Calculator & RFC References"
Cohesion: 0.26
Nodes (19): RFC-1918, RFC-3021, calculate(), classfulPrefix(), isPrivateIPv4(), netClassOf(), parseInput(), subnet() (+11 more)

### Community 11 - "Package Manifest Metadata"
Cohesion: 0.10
Nodes (20): author, description, license, main, name, scripts, build, dev (+12 more)

### Community 12 - "SSH IPC & Session Service"
Cohesion: 0.20
Nodes (19): broadcast(), registerSshIpc(), registerSshClient(), ActiveSession, connect(), decrypt(), deleteProfile(), disconnectAll() (+11 more)

### Community 13 - "SFTP Browser UI Components"
Cohesion: 0.16
Nodes (15): formatDate(), formatEta(), formatSize(), formatSpeed(), Panel(), PanelEntry, PanelProps, Props (+7 more)

### Community 14 - "Speedtest HTTP Fallback Engine"
Cohesion: 0.26
Nodes (14): calcJitter(), CDN_DOWNLOAD_PROBES, CF_DOWNLOAD_PROBES, FallbackProgressCallback, fetchWithTimeout(), LATENCY_PROBES, makeRandomBlob(), measureDownloadBps() (+6 more)

### Community 15 - "Native Ping Bridge"
Cohesion: 0.15
Nodes (8): net-ping, PingCallback, RequestTimedOutError, Session, SessionOptions, TimeExceededError, TraceDoneCallback, TraceFeedCallback

### Community 16 - "App Shell & i18n"
Cohesion: 0.17
Nodes (5): App(), ModuleId, NAV_ITEMS, NavItem, SETTINGS_ITEM

### Community 17 - "Speedtest Renderer Store"
Cohesion: 0.27
Nodes (12): attachGlobalHandlers(), disposeEngine(), loadNetworkInfoFallback(), MEASUREMENTS, phaseFromType(), runCloudflareEngine(), runFallback(), saveToHistory() (+4 more)

### Community 18 - "Password Generator"
Cohesion: 0.26
Nodes (11): buildAlphabet(), estimateStrength(), generatePassword(), PASSWORD_LIMITS, PasswordOptions, randomInt(), SETS, SIMILAR (+3 more)

### Community 19 - "Shared App Settings Types"
Cohesion: 0.17
Nodes (11): AppSettings, DEFAULT_SETTINGS, IpcError, IpcResult, Locale, PlatformInfo, ThemeMode, UpdateInfo (+3 more)

### Community 20 - "Ping/Port Page UI"
Cohesion: 0.24
Nodes (4): Tab, LogLine, PingTab(), PortTab()

### Community 21 - "DNS Shared Types"
Cohesion: 0.20
Nodes (9): DNS_RECORD_TYPES, DnsLookupResult, DnsQuery, DnsRecord, DnsRecordType, SslQuery, SslResult, WhoisQuery (+1 more)

### Community 22 - "Traceroute Page UI"
Cohesion: 0.33
Nodes (6): copyText(), exportCsv(), fmtLoss(), fmtMs(), HopRow(), TracerPage()

### Community 23 - "Ping/Port Shared Types"
Cohesion: 0.22
Nodes (7): ContinuousStartQuery, ContinuousTick, PingResult, PORT_SERVICES, PortCheckQuery, PortResult, PortStatus

### Community 24 - "Speedtest Main Service"
Cohesion: 0.54
Nodes (7): fetchJson(), fetchText(), getNetworkInfo(), parseTrace(), tryCloudflare(), tryIpApi(), tryIpify()

### Community 25 - "Speedtest Page UI"
Cohesion: 0.48
Nodes (5): exportHistoryCsv(), fmt(), gaugeFraction(), Speedometer(), SpeedtestPage()

### Community 26 - "Speedtest Preflight Checks"
Cohesion: 0.47
Nodes (5): fetchWithTimeout(), FirewallHint, isTimingBlocked(), PreflightResult, runPreflight()

### Community 27 - "Scanner Shared Types"
Cohesion: 0.33
Nodes (5): LocalSubnet, ScanHost, ScanHostEvent, ScanProgress, ScanQuery

### Community 28 - "Traceroute Shared Types"
Cohesion: 0.33
Nodes (5): TraceHop, TraceMethod, TraceRouteEvent, TraceSample, TraceStartQuery

### Community 29 - "Speedtest Firewall Warning UI"
Cohesion: 0.40
Nodes (3): FirewallWarningProps, HINT_CONFIG, HintConfig

### Community 32 - "Speedtest Shared Types"
Cohesion: 0.50
Nodes (4): NetworkInfo, SpeedtestHistoryEntry, SpeedtestPhase, SpeedtestResult

### Community 33 - "WHOIS Lookup Bridge"
Cohesion: 0.50
Nodes (3): LookupCallback, LookupOptions, whois

### Community 35 - "SSH Profile Form UI"
Cohesion: 0.67
Nodes (3): generateId(), Props, SshProfileForm()

### Community 36 - "Export Utilities (CSV/JSON)"
Cohesion: 1.00
Nodes (3): download(), exportCsv(), exportJson()

## Knowledge Gaps
- **250 isolated node(s):** `sharedAlias`, `name`, `version`, `description`, `main` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handle()` connect `Local Subnet Scanner & Main Window` to `SSH IPC & Session Service`, `SFTP IPC & Service Layer`, `DNS IPC & Lookup Service`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `dependencies` connect `External NPM Dependencies` to `Package Manifest Metadata`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Electron Build Tooling Deps` to `Package Manifest Metadata`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `sharedAlias`, `name`, `version` to the rest of the system?**
  _250 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Local Subnet Scanner & Main Window` be split into smaller, more focused modules?**
  _Cohesion score 0.09661016949152543 - nodes in this community are weakly interconnected._
- **Should `ARP/OUI MAC Resolution` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `External NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._