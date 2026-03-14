const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function classifyLetter(text, songTitle) {
  if (!text || text.length < 2) return 'friendship'; // Default for empty/very short

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Corrected model name
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that classifies letters into one of three categories: love, friendship, or family. Return only the category name in lowercase."
          },
          {
            role: "user",
            content: `Classify this letter (and song title if relevant) into Love, Friendship or Family. Return only one word.\n\nSong: ${songTitle}\nLetter: ${text}`
          }
        ]
      })
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim().toLowerCase();
    }
  } catch (error) {
    console.error('Error classifying letter:', error);
  }
  return 'friendship'; // Fallback
}

async function run() {
  console.log('Starting bulk classification...');
  
  const { data: letters, error } = await supabase
    .from("letters")
    .select("id, message, song_title")
    .is("category", null);

  if (error) {
    console.error('Error fetching letters:', error);
    return;
  }

  console.log(`Found ${letters.length} letters to classify.`);

  for (const letter of letters) {
    const category = await classifyLetter(letter.message, letter.song_title);
    
    const { error: updateError } = await supabase
      .from("letters")
      .update({ category })
      .eq("id", letter.id);

    if (updateError) {
      console.error(`Failed to update ${letter.id}:`, updateError.message);
    } else {
      console.log(`Updated ${letter.id} -> ${category}`);
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Bulk classification complete.');
}

run();
