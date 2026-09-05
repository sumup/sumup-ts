import SumUp, { EventPayloadError, EventSignatureError } from "@sumup/sdk";

const secret = Deno.env.get("SUMUP_EVENT_SECRET");
if (!secret) throw new Error("Set SUMUP_EVENT_SECRET before starting.");
const client = new SumUp({ apiKey: Deno.env.get("SUMUP_API_KEY") });
const events = client.eventsHandler(secret, (event) => {
  console.info("Unhandled event", event.id, event.type);
});
events.on("members.updated", (event) => {
  console.info("Member updated", event.id, event.object.id);
  // With an API key, await event.fetchObject() to get the latest Member.
});

async function handleRequest(request: Request): Promise<Response> {
  if (new URL(request.url).pathname !== "/events") {
    return new Response(null, { status: 404 });
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  try {
    // Verify the unchanged bytes before running callbacks.
    await events.handleRequest(request);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof EventSignatureError) {
      return new Response(null, { status: 401 });
    }
    if (error instanceof EventPayloadError) {
      return new Response(null, { status: 400 });
    }
    console.error("Event processing failed", error);
    return new Response(null, { status: 500 });
  }
}

// Configure a body-size limit in your hosting platform or reverse proxy.
Deno.serve({ port: Number(Deno.env.get("PORT") ?? 3000) }, handleRequest);
