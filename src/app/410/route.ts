export async function GET() {
  return new Response(null, {
    status: 410,
    statusText: 'Gone',
  });
}

// Also handle other methods if necessary
export async function POST() { return GET(); }
export async function HEAD() { return GET(); }
