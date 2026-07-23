/**
 * Minimal Express server that verifies and parses SumUp webhooks.
 *
 * Required environment variables:
 * - `SUMUP_WEBHOOK_SECRET`
 *
 * Optional environment variables:
 * - `SUMUP_API_KEY`
 * - `PORT`
 */

import SumUp, {
  CheckoutCreatedEvent,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  WebhookPayloadError,
  WebhookSignatureError,
  WebhookSignatureExpiredError,
  WebhookTimestampError,
} from "@sumup/sdk";
import express from "express";

const webhookSecret = process.env.SUMUP_WEBHOOK_SECRET;
if (!webhookSecret) {
  throw new Error(
    "Missing SUMUP_WEBHOOK_SECRET environment variable. Please configure it before starting the example.",
  );
}

const client = new SumUp({
  apiKey: process.env.SUMUP_API_KEY,
});
const webhooks = client.webhookHandler(webhookSecret);

const app = express();
app.use("/webhooks", express.raw({ type: "*/*" }));

/** Receives webhook deliveries, verifies them, and logs the event. */
app.post("/webhooks", async (req, res) => {
  const signature = req.header(SIGNATURE_HEADER) ?? "";
  const timestamp = req.header(TIMESTAMP_HEADER) ?? "";
  const body = req.body instanceof Buffer ? req.body.toString("utf8") : "";

  try {
    const event = await webhooks.verifyAndParse(body, signature, timestamp);

    console.info("Received webhook", {
      id: event.id,
      objectId: event.object.id,
      type: event.type,
    });

    if (event instanceof CheckoutCreatedEvent) {
      const checkout = await event.fetchObject();
      console.info("Fetched checkout status", checkout.status);
    }

    res.status(204).end();
  } catch (error) {
    if (
      error instanceof WebhookSignatureError ||
      error instanceof WebhookSignatureExpiredError ||
      error instanceof WebhookTimestampError
    ) {
      res.status(401).send("Invalid webhook signature");
      return;
    }

    if (error instanceof WebhookPayloadError) {
      res.status(400).send("Invalid webhook payload");
      return;
    }

    console.error("Unhandled webhook error", error);
    res.status(500).send("Internal Server Error");
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.info(`Listening for webhooks on http://localhost:${port}/webhooks`);
});
