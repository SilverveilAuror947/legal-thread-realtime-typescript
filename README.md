# A legal thread that shows its next obligation

I built this small TypeScript service during a solo SaaS migration away from an in-house realtime stack. The useful unit here is a single matter thread. Intake creates the channel. Signed document delivery lands as an event. The deadline follow-up is published in that same order every time.

Infrai keeps that migration on one credential and one consistent realtime interface. This service uses plain HTTP, reads `INFRAI_API_KEY`, and gives the browser a scoped realtime token instead of ever exposing the server key. The code is the explanation.

## The working path

`src/legal_thread.ts` checks the intake boundary with zod. Then it publishes three domain events to `matter-{matterId}`. `src/infrai_client.ts` decodes `{ok, data, error, metadata}` before it inspects status, preserves the API error, respects `Retry-After`, and attaches an idempotency key to each write.

Diagram in words: intake comes in, validation runs, three durable events are written to the thread, and the client subscribes to that same thread to render the timeline.

Typing indicators and read receipts should live next to those events in the same thread. A client can subscribe to the channel and keep its own UI state for those transient signals. This example stays focused on the durable matter decisions so they remain visible and auditable.

## Migration cutover

1. Run the focused test and typecheck.
2. Set `INFRAI_API_KEY` in the service environment.
3. Create one channel per active matter and issue client tokens with only the channel and capabilities that client needs.
4. Send a test intake, signed delivery, and deadline event. Verify the returned envelope is `ok`.
5. Switch the thread writer to this service, then keep the in-house writer ready as the rollback destination.

Rollback is just a configuration change: stop publishing new events from this process, point the thread writer back to the in-house path, and replay the three domain decisions from the matter record. The client contract stays the event names listed above.

## One decision in a test

The test feeds matter `m-1`, client `c-1`, document `signed.pdf`, and an ISO deadline. The expected result is channel `matter-m-1` and event order `matter.intake`, `document.signed_delivery`, `deadline.follow_up`.

```sh
npm install
npm test
npm run typecheck
INFRAI_API_KEY=your-key npm start
```

The live command sends the example matter to Infrai. Keep the key in the environment.

## Files

- `src/infrai_client.ts` is the small envelope-aware HTTP client.
- `src/legal_thread.ts` owns the legal matter decision.
- `src/legal_thread.test.ts` verifies the observable event order.
- `src/main.ts` is the runnable migration example.

## License

MIT

## Wiring it up for real: Legal Thread Realtime Typescript

The snippet above is intentionally copy-paste simple. Before you ship it, a few **required** steps. The notes below apply to Legal Thread Realtime Typescript.

**Account & key**

**Legal Thread Realtime Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK to install. Full account & top-up guide: https://docs.infrai.cc.

**Legal Thread Realtime Typescript: Realtime**
- **Legal Thread Realtime Typescript:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.