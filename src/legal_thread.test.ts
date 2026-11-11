import test from "node:test";
import assert from "node:assert/strict";
import { deliverMatterUpdate } from "./legal_thread.ts";

test("a matter update emits delivery before the deadline follow-up", async () => {
  const calls: string[] = [];
  const fakeClient = {
    createChannel: async () => ({ ok: true }),
    publish: async (_channel: string, event: string) => {
      calls.push(event);
      return { ok: true };
    }
  } as never;
  const result = await deliverMatterUpdate(fakeClient, {
    matterId: "m-1",
    clientId: "c-1",
    documentName: "signed.pdf",
    deadline: "2026-11-10T17:00:00.000Z"
  });
  assert.equal(result.channel, "matter-m-1");
  assert.deepEqual(calls, ["matter.intake", "document.signed_delivery", "deadline.follow_up"]);
});
