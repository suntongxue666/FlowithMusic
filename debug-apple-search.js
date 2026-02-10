// Native fetch is available in Node 18+

async function testSearch(song, artist, country = 'US') {
    const term = encodeURIComponent(`${song} ${artist}`);
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=5&country=${country}`;
    console.log(`\n--- Searching: ${song} - ${artist} (Country: ${country || 'Global'}) ---`);
    console.log(`URL: ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log(`Found ${data.resultCount} results`);

        data.results.forEach((track, i) => {
            console.log(`${i + 1}. [${track.trackTimeMillis}ms] ${track.trackName} - ${track.artistName}`);
            console.log(`   Album: ${track.collectionName}`);
            console.log(`   Preview: ${track.previewUrl ? '✅' : '❌'}`);
            if (i === 0) console.log(`   URL: ${track.trackViewUrl}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function run() {
    // Style - Taylor Swift
    // Target duration from Spotify for "Style" is usually ~231031ms (3:51)
    await testSearch('Style', 'Taylor Swift');
    await testSearch('Style', 'Taylor Swift', 'CN');

    // Test with "Taylor's Version" if duration matching is too strict
    await testSearch("Style (Taylor's Version)", 'Taylor Swift');
    await testSearch("Style (Taylor's Version)", 'Taylor Swift', 'CN');
}

run();
