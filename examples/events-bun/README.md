# Events with Bun

```sh
# From the repository root; build the local SDK first:
cd sdk && npm ci && npm run build
cd ../examples/events-bun
npm ci
SUMUP_EVENT_SECRET="your-signing-secret" npm start
```

Requires Bun. Send notifications to `POST http://localhost:3000/events`. Set `PORT` to change the port and `SUMUP_API_KEY` if your callback uses `event.fetchObject()`.

Pass raw body bytes unchanged and make callbacks idempotent. The receiver limits bodies to 1 MiB. Successful processing returns 204; failed processing returns 500 so delivery can be retried.
