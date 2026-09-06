import SumUp, {
  EventPayloadError,
  EventSignatureError,
  SIGNATURE_HEADER,
} from "@sumup/sdk";
import express from "express";

const secret = process.env.SUMUP_EVENT_SECRET;
if (!secret) throw new Error("Set SUMUP_EVENT_SECRET before starting.");

const client = new SumUp({ apiKey: process.env.SUMUP_API_KEY });
const events = client.eventsHandler(secret, (event) => {
  console.info("Unhandled event", event.id, event.type);
});
events.on("members.updated", (event) => {
  console.info("Member updated", event.id, event.object.id);
  // With an API key, await event.fetchObject() to get the latest Member.
});

const app = express();
// Register before express.json(): verification needs the unchanged body bytes.
app.post(
  "/events",
  express.raw({ type: "application/json", limit: "1mb", inflate: false }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      res.status(400).send("Expected a raw JSON body");
      return;
    }
    try {
      await events.handle(req.body, req.header(SIGNATURE_HEADER) ?? "");
      res.status(204).end();
    } catch (error) {
      if (error instanceof EventSignatureError) {
        res.status(401).send("Invalid signature");
      } else if (error instanceof EventPayloadError) {
        res.status(400).send("Invalid payload");
      } else {
        console.error("Event processing failed", error);
        res.status(500).send("Event processing failed");
      }
    }
  },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () =>
  console.info(`Listening on http://localhost:${port}/events`),
);
