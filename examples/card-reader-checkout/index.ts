import SumUp from "@sumup/sdk";

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

  const readers = await client.readers.list(merchantCode);
  if (!readers.items.length) {
    console.warn("No readers found, please pair a card reader first.");
    return;
  }

  const reader = readers[0];

  const checkout = client.readers.createCheckout(merchantCode, reader.id, {
    total_amount: {
      // Must match the currency of your merchant account
      currency: "EUR",
      minor_unit: 100,
      value: 500,
    },
  });

  console.info({ checkout });
}

main();
