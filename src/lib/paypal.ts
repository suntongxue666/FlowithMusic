const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
    throw new Error('Missing PayPal credentials');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = await response.json();
  return data.access_token;
}

export async function createOrder(amount: string, description: string, userId: string) {
  const accessToken = await getPayPalAccessToken();
  const url = `${PAYPAL_BASE}/v2/checkout/orders`;
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://flowingmusic.vercel.app');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount,
          },
          description: description,
          custom_id: userId,
        },
      ],
      application_context: {
        brand_name: 'FlowithMusic',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: `${baseUrl}/premium?status=success_order`,
        cancel_url: `${baseUrl}/premium?status=cancel`,
      },
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || 'Failed to create PayPal order');
  }

  return data;
}
