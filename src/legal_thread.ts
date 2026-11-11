import { z } from "zod";
import type { InfraiClient } from "./infrai_client.ts";

export const intakeSchema = z.object({
  matterId: z.string().min(1),
  clientId: z.string().min(1),
  documentName: z.string().min(1),
  deadline: z.string().datetime()
});

export type MatterIntake = z.infer<typeof intakeSchema>;

export function threadChannel(matterId: string): string {
  return `matter-${matterId}`;
}

export async function deliverMatterUpdate(client: InfraiClient, input: unknown): Promise<{ channel: string; events: string[] }> {
  const matter = intakeSchema.parse(input);
  const channel = threadChannel(matter.matterId);
  await client.createChannel(channel);
  await client.publish(channel, "matter.intake", { matter_id: matter.matterId, client_id: matter.clientId }, matter.clientId, `${matter.matterId}:intake`);
  await client.publish(channel, "document.signed_delivery", { document_name: matter.documentName }, matter.clientId, `${matter.matterId}:document`);
  await client.publish(channel, "deadline.follow_up", { deadline: matter.deadline }, matter.clientId, `${matter.matterId}:deadline`);
  return { channel, events: ["matter.intake", "document.signed_delivery", "deadline.follow_up"] };
}
