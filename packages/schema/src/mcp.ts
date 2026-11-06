export * as Mcp from "./mcp.js"

import { Schema } from "effect"
import { optional, PositiveInt } from "./schema.js"
import { IntegrationID } from "./integration-id.js"

export class TimeoutConfig extends Schema.Class<TimeoutConfig>("Mcp.TimeoutConfig")({
  startup: PositiveInt.pipe(optional).annotate({
    description: "Maximum time in milliseconds to establish and initialize the MCP server.",
  }),
  catalog: PositiveInt.pipe(optional).annotate({
    description: "Maximum time in milliseconds to wait for MCP discovery requests such as tools/list and prompts/list.",
  }),
  execution: PositiveInt.pipe(optional).annotate({
    description: "Maximum time in milliseconds to wait for MCP tool and prompt execution.",
  }),
}) {}

export type Protocol = typeof Protocol.Type
export const Protocol = Schema.Literals(["legacy", "auto", "2026-07-28"]).annotate({
  identifier: "Mcp.Protocol",
  description:
    'MCP protocol negotiation. "legacy" (default) opens with the initialize handshake and speaks protocol revisions up to 2025-11-25. "auto" probes for the 2026-07-28 revision and falls back to legacy when the server does not support it. "2026-07-28" requires that revision and fails otherwise.',
})

export class LocalConfig extends Schema.Class<LocalConfig>("Mcp.LocalConfig")({
  type: Schema.Literal("local"),
  command: Schema.String.pipe(Schema.Array),
  cwd: Schema.String.pipe(optional).annotate({
    description: "Working directory for the MCP server process. Relative paths resolve from the workspace directory.",
  }),
  environment: Schema.Record(Schema.String, Schema.String).pipe(optional),
  disabled: Schema.Boolean.pipe(optional),
  codemode: Schema.Boolean.pipe(optional).annotate({
    description: "Expose this server's tools through Code Mode. Defaults to true.",
  }),
  timeout: TimeoutConfig.pipe(optional),
  protocol: Protocol.pipe(optional),
  pool: Schema.Boolean.pipe(optional).annotate({
    description:
      'Share one connection to this server across every directory that configures it identically, instead of one per directory. Only connections that negotiate the 2026-07-28 revision are shared; an unset "protocol" becomes "auto", and "legacy" never shares. Defaults to false.',
  }),
}) {}

export class OAuthConfig extends Schema.Class<OAuthConfig>("Mcp.OAuthConfig")({
  client_id: Schema.String.pipe(optional),
  client_secret: Schema.String.pipe(optional),
  scope: Schema.String.pipe(optional),
  callback_port: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 })).pipe(optional),
  redirect_uri: Schema.String.pipe(optional),
  auth_server_metadata_url: Schema.String.pipe(optional).annotate({
    description:
      "URL of the OAuth or OpenID Connect authorization server metadata document. Set when the MCP server does not publish protected resource metadata that names its authorization server.",
  }),
}) {}

export class RemoteConfig extends Schema.Class<RemoteConfig>("Mcp.RemoteConfig")({
  type: Schema.Literal("remote"),
  url: Schema.String,
  headers: Schema.Record(Schema.String, Schema.String).pipe(optional),
  oauth: Schema.Union([OAuthConfig, Schema.Literal(false)]).pipe(optional),
  disabled: Schema.Boolean.pipe(optional),
  codemode: Schema.Boolean.pipe(optional).annotate({
    description: "Expose this server's tools through Code Mode. Defaults to true.",
  }),
  timeout: TimeoutConfig.pipe(optional),
  protocol: Protocol.pipe(optional),
  pool: Schema.Boolean.pipe(optional).annotate({
    description:
      'Share one connection to this server across every directory that configures it identically, instead of one per directory. Only connections that negotiate the 2026-07-28 revision are shared; an unset "protocol" becomes "auto", and "legacy" never shares. Defaults to false.',
  }),
}) {}

export const ServerConfig = Schema.Union([LocalConfig, RemoteConfig]).pipe(Schema.toTaggedUnion("type"))
export type ServerConfig = typeof ServerConfig.Type

const Connected = Schema.Struct({ status: Schema.Literal("connected") }).annotate({
  identifier: "Mcp.Status.Connected",
})
const Pending = Schema.Struct({ status: Schema.Literal("pending") }).annotate({
  identifier: "Mcp.Status.Pending",
})
const Disabled = Schema.Struct({ status: Schema.Literal("disabled") }).annotate({
  identifier: "Mcp.Status.Disabled",
})
const Failed = Schema.Struct({ status: Schema.Literal("failed"), error: Schema.String }).annotate({
  identifier: "Mcp.Status.Failed",
})
const NeedsAuth = Schema.Struct({ status: Schema.Literal("needs_auth"), error: Schema.String }).annotate({
  identifier: "Mcp.Status.NeedsAuth",
})

export type Status = typeof Status.Type
export const Status = Schema.Union([Connected, Pending, Disabled, Failed, NeedsAuth]).pipe(
  Schema.toTaggedUnion("status"),
)

export interface Server extends Schema.Schema.Type<typeof Server> {}
export const Server = Schema.Struct({
  name: Schema.String,
  status: Status,
  // Display title from the connected server's `serverInfo.title`; absent while disconnected or when not provided.
  title: optional(Schema.String),
  // Set for remote servers registered as OAuth integrations; lets clients act on the right integration
  // without matching by name, which could collide with provider or plugin integrations.
  integrationID: optional(IntegrationID),
}).annotate({ identifier: "Mcp.Server" })

export interface Resource extends Schema.Schema.Type<typeof Resource> {}
export const Resource = Schema.Struct({
  server: Schema.String,
  name: Schema.String,
  uri: Schema.String,
  description: optional(Schema.String),
  mimeType: optional(Schema.String),
}).annotate({ identifier: "Mcp.Resource" })

export interface ResourceTemplate extends Schema.Schema.Type<typeof ResourceTemplate> {}
export const ResourceTemplate = Schema.Struct({
  server: Schema.String,
  name: Schema.String,
  uriTemplate: Schema.String,
  description: optional(Schema.String),
  mimeType: optional(Schema.String),
}).annotate({ identifier: "Mcp.ResourceTemplate" })

export interface ResourceCatalog extends Schema.Schema.Type<typeof ResourceCatalog> {}
export const ResourceCatalog = Schema.Struct({
  resources: Schema.Array(Resource),
  templates: Schema.Array(ResourceTemplate),
}).annotate({ identifier: "Mcp.ResourceCatalog" })

export const ResourceContentPart = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("text"),
    uri: Schema.String,
    text: Schema.String,
    mimeType: optional(Schema.String),
  }),
  Schema.Struct({
    type: Schema.Literal("blob"),
    uri: Schema.String,
    blob: Schema.String,
    mimeType: optional(Schema.String),
  }),
]).pipe(Schema.toTaggedUnion("type"), Schema.annotate({ identifier: "Mcp.ResourceContentPart" }))
export type ResourceContentPart = typeof ResourceContentPart.Type

/** Content Security Policy domains an MCP App declares for its view. */
export interface UiCsp extends Schema.Schema.Type<typeof UiCsp> {}
export const UiCsp = Schema.Struct({
  connectDomains: optional(Schema.Array(Schema.String)),
  resourceDomains: optional(Schema.Array(Schema.String)),
  frameDomains: optional(Schema.Array(Schema.String)),
  baseUriDomains: optional(Schema.Array(Schema.String)),
}).annotate({ identifier: "Mcp.UiCsp" })

/** Browser permissions an MCP App declares. A present key is a request; the host decides whether to grant it. */
export interface UiPermissions extends Schema.Schema.Type<typeof UiPermissions> {}
export const UiPermissions = Schema.Struct({
  camera: optional(Schema.Unknown),
  microphone: optional(Schema.Unknown),
  geolocation: optional(Schema.Unknown),
  clipboardWrite: optional(Schema.Unknown),
}).annotate({ identifier: "Mcp.UiPermissions" })

/** Visual and security metadata for an MCP App resource. */
export interface UiResourceMeta extends Schema.Schema.Type<typeof UiResourceMeta> {}
export const UiResourceMeta = Schema.Struct({
  csp: optional(UiCsp),
  permissions: optional(UiPermissions),
  domain: optional(Schema.String),
  prefersBorder: optional(Schema.Boolean),
}).annotate({ identifier: "Mcp.UiResourceMeta" })

export interface ResourceContent extends Schema.Schema.Type<typeof ResourceContent> {}
export const ResourceContent = Schema.Struct({
  server: Schema.String,
  uri: Schema.String,
  contents: Schema.Array(ResourceContentPart),
  ui: optional(UiResourceMeta),
}).annotate({ identifier: "Mcp.ResourceContent" })

/** A tool linked to a UI resource. `name` is the namespaced tool name the model and session use. */
export interface AppLink extends Schema.Schema.Type<typeof AppLink> {}
export const AppLink = Schema.Struct({
  server: Schema.String,
  tool: Schema.String,
  name: Schema.String,
  title: optional(Schema.String),
  description: optional(Schema.String),
  resourceUri: Schema.String,
  visibility: optional(Schema.Array(Schema.Literals(["model", "app"]))),
  inputSchema: optional(Schema.Record(Schema.String, Schema.Unknown)),
}).annotate({ identifier: "Mcp.AppLink" })

export interface AppCatalog extends Schema.Schema.Type<typeof AppCatalog> {}
export const AppCatalog = Schema.Struct({
  apps: Schema.Array(AppLink),
}).annotate({ identifier: "Mcp.AppCatalog" })

/** A fetched `ui://` document, ready for a sandboxed frame. */
export interface AppResource extends Schema.Schema.Type<typeof AppResource> {}
export const AppResource = Schema.Struct({
  server: Schema.String,
  uri: Schema.String,
  mimeType: Schema.String,
  html: Schema.String,
  ui: optional(UiResourceMeta),
}).annotate({ identifier: "Mcp.AppResource" })

export const AppToolContent = Schema.Union([
  Schema.Struct({ type: Schema.Literal("text"), text: Schema.String }),
  Schema.Struct({
    type: Schema.Literal("media"),
    data: Schema.String,
    mimeType: Schema.String,
    uri: optional(Schema.String),
  }),
]).pipe(Schema.toTaggedUnion("type"), Schema.annotate({ identifier: "Mcp.AppToolContent" }))
export type AppToolContent = typeof AppToolContent.Type

export interface AppToolResult extends Schema.Schema.Type<typeof AppToolResult> {}
export const AppToolResult = Schema.Struct({
  isError: Schema.Boolean,
  content: Schema.Array(AppToolContent),
  structured: optional(Schema.Unknown),
  meta: optional(Schema.Record(Schema.String, Schema.Unknown)),
}).annotate({ identifier: "Mcp.AppToolResult" })
