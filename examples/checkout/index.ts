import SumUp, { type CheckoutCreateRequest } from "@sumup/sdk";

const client = new SumUp({
  apiKey: process.env.SUMUP_API_KEY,
});

async function main() {
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;
  if (!merchantCode) {
    console.warn(
      "Missing merchant code, please specify merchant code using SUMUP_MERCHANT_CODE env variable.",
    );
    return;
  }

  const merchant = await client.merchants.get(merchantCode);
  console.info({ merchant });

  const merchant2 = await client.merchants.get(merchantCode).withResponse();
  console.info({ merchant2 });

  const request: CheckoutCreateRequest = {
    amount: 19,
    checkout_reference: "CO746453",
    currency: "EUR",
    merchant_code: merchantCode,
  };

  const checkout = await client.checkouts.create(request);

  // Collect customer's card data

  const result = client.checkouts.process(checkout.id, {
    card: {
      cvv: "123",
      expiry_month: "12",
      expiry_year: "2023",
      name: "Boaty McBoatface",
      number: "4200000000000042",
    },
    payment_type: "card",
  });

  console.info({ result });
}

main();
