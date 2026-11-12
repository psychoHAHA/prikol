const token = process.env.STRATZ_TOKEN?.trim();
if (!token) {
  console.error('STRATZ_TOKEN is empty. Add your token to .env.local.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch('https://api.stratz.com/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'STRATZ_API' },
      body: JSON.stringify({ query: '{ __typename }' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`STRATZ returned HTTP ${response.status}.`);
      process.exitCode = 1;
    } else {
      const body = await response.json();
      if (body.errors?.length || body.data?.__typename !== 'DotaQuery') {
        console.error('STRATZ returned an unexpected GraphQL response.');
        process.exitCode = 1;
      } else {
        console.log('STRATZ authentication succeeded.');
      }
    }
  } catch {
    console.error('Could not reach STRATZ. Check your connection and try again.');
    process.exitCode = 1;
  }
}
