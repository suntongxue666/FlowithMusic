
const clientId = 'ab969f52c02e4bb4b1e23d68437fe4cd';
const clientSecret = '35efa8d5e10d46de83c4b29faf5006b9';

async function testSpotify() {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Token Data Success');

    if (response.ok && data.access_token) {
        console.log('Testing search with Chinese query...');
        const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent('周杰伦')}&type=track&limit=1&market=US`,
            {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            }
        );
        console.log('Search Status:', searchRes.status);
        console.log('Search Headers:', JSON.stringify([...searchRes.headers], null, 2));
        const searchBody = await searchRes.text();
        console.log('Search Body:', searchBody);
        
        if (searchRes.ok) {
            const searchData = JSON.parse(searchBody);
            console.log('Search Result Count:', searchData.tracks?.items?.length);
        } else if (searchRes.status === 429) {
            console.log('### Caught 429! ###');
            console.log('Retry-After:', searchRes.headers.get('Retry-After'));
        }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpotify();
