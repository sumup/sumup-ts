import SumUp from "@sumup/sdk";

const client = new SumUp({
  apiKey: process.env.SUMUP_API_KEY,
});

async function main() {
  const merchant = await client.merchant.get();
  console.info({ merchant });

  const merchant2 = await client.merchant.get().withResponse();
  console.info({ merchant2 });

  const merchantCode = "MERCHANT_CODE";

  const readers = await client.readers.list(merchantCode);
  const reader = readers[0];

  client.readers.createCheckout(merchantCode, reader.id, {
    total_amount: {
      currency: "EUR",
      minor_unit: 100,
      value: 500,
    },
  });

  const checkout = await client.checkouts.create({
    amount: 19,
    checkout_reference: "CO746453",
    currency: "EUR",
    merchant_code: merchantCode,
  });

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
