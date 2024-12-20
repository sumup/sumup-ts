import SumUp from "@sumup/sdk";

const client = new SumUp({
  apiKey: process.env.SUMUP_API_KEY,
});

async function main() {
  const merchant = await client.merchant.get();
  console.info({ merchant });

  const merchant2 = await client.merchant.get().withResponse();
  console.info({ merchant2 });
}

main();
