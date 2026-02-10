// Native fetch is available in Node 18+

async function testSearch(song, artist, country = 'US') {
    const term = encodeURIComponent(`${song} ${artist}`);
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5&country=${country}`;
    console.log(`\n--- Searching: "${song}" by "${artist}" (Country: ${country}) ---`);
    console.log(`URL: ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Found ${data.resultCount} results`);

        if (data.resultCount === 0) {
            console.log("❌ NO RESULTS FOUND");
            return;
        }

        data.results.forEach((track, i) => {
            console.log(`${i + 1}. [${track.trackTimeMillis}ms] ${track.trackName} - ${track.artistName}`);
            console.log(`   Album: ${track.collectionName}`);
            console.log(`   Preview: ${track.previewUrl ? '✅' : '❌'}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    // Basic Style check
    await testSearch('Style', 'Taylor Swift', 'CN');

    // Simulate "dirty" titles from Spotify
    await testSearch('Style - 2014 Remaster', 'Taylor Swift', 'CN');
    await testSearch('Love Story - International Mix', 'Taylor Swift', 'CN');
    await testSearch('Blank Space - Deluxe Edition', 'Taylor Swift', 'CN');
    await testSearch('Style (Taylor\'s Version)', 'Taylor Swift', 'CN');

    // Test a suspected "non-matching" old song
    await testSearch('Our Song', 'Taylor Swift', 'CN');
    await testSearch('Love Story (Digital Dog Remix)', 'Taylor Swift', 'CN');
}

run();
