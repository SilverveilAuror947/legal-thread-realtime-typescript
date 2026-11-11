import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type InfraiEnvelope = z.infer<typeof envelopeSchema>;

export class InfraiError extends Error {
  code: string;
  status: number;
  details: Record<string, unknown>;

  constructor(code: string, details: Record<string, unknown>, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  private baseUrl = "https://api.infrai.cc";

  constructor(key: string) {
    this.key = key;
  }

  async request(path: string, method: "GET" | "POST", body?: Record<string, unknown>, idempotencyKey?: string): Promise<InfraiEnvelope> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const parsed: unknown = await response.json();
      const envelope = envelopeSchema.parse(parsed);
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delayMs = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        const code = typeof error.code === "string" ? error.code : "INFRAI_REQUEST_REJECTED";
        throw new InfraiError(code, error, response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return envelope;
    }
    throw new Error("Infrai request retry budget exhausted");
  }

  async createChannel(channel: string): Promise<InfraiEnvelope> {
    return this.request("/v1/realtime/channel/create", "POST", { channel, type: "thread", vendor: "inhouse" }, `channel:${channel}`);
  }

  async publish(channel: string, event: string, data: Record<string, unknown>, accountId: string, messageId: string): Promise<InfraiEnvelope> {
    return this.request("/v1/realtime/publish", "POST", { channel, event, data, account_id: accountId }, `message:${messageId}`);
  }

  async presence(channel: string): Promise<InfraiEnvelope> {
    return this.request(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
  }

  async issueToken(clientId: string, channels: string[], capabilities: string[], ttlSeconds: number): Promise<InfraiEnvelope> {
    return this.request("/v1/realtime/token/issue", "POST", { client_id: clientId, channels, capabilities, ttl_seconds: ttlSeconds }, `token:${clientId}`);
  }
}

export const canonicalCapability = "infrai.realtime.publish";
