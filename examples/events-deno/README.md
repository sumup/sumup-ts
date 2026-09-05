# Events with Deno

```sh
# From the repository root; build the local SDK first:
cd sdk && npm ci && npm run build
cd ../examples/events-deno
npm ci
npm run check
SUMUP_EVENT_SECRET="your-signing-secret" npm start
```

Requires Deno 2. Send notifications to `POST http://localhost:3000/events`. Set `PORT` to change the port and `SUMUP_API_KEY` if your callback uses `event.fetchObject()`.

Pass raw body bytes unchanged and make callbacks idempotent. Configure a body-size limit in your hosting platform or reverse proxy. Successful processing returns 204; failed processing returns 500 so delivery can be retried.
