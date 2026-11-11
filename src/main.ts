import { InfraiClient } from "./infrai_client.ts";
import { deliverMatterUpdate } from "./legal_thread.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

const client = new InfraiClient(key);
const result = await deliverMatterUpdate(client, {
  matterId: "matter-1042",
  clientId: "client-77",
  documentName: "engagement-letter.pdf",
  deadline: "2026-11-10T17:00:00.000Z"
});
await client.issueToken("client-77", [result.channel], ["publish", "subscribe"], 3600);
await client.presence(result.channel);
console.log(JSON.stringify(result, null, 2));
