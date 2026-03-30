
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

    const data = await response.json();
    if (response.ok && data.access_token) {
        console.log('Testing recommendations...');
        const recRes = await fetch(
            `https://api.spotify.com/v1/recommendations?seed_genres=pop&limit=1&market=US`,
            {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            }
        );
        console.log('Rec Status:', recRes.status);
        console.log('Rec Body:', await recRes.text());
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testSpotify();
