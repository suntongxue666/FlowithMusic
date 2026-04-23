import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/paypal';

export async function POST(req: Request) {
  try {
    const { amount, planName, userId } = await req.json();

    if (!amount || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const order = await createOrder(
      amount, 
      `FlowithMusic - ${planName}`, 
      userId
    );

    // Find the approve link
    const approveLink = order.links.find((link: any) => link.rel === 'approve');

    if (!approveLink) {
      throw new Error('No approve link found in PayPal response');
    }

    return NextResponse.json({ url: approveLink.href, orderId: order.id });
  } catch (error: any) {
    console.error('PayPal Order Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
