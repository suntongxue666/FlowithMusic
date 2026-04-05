const fs = require('fs');

// 1. 加载配置
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const CLIENT_ID = env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const SECRET = env.PAYPAL_SECRET;
const PAYPAL_API = 'https://api-m.paypal.com'; // 生产环境

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return data.access_token;
}

// 查询订阅详情
async function getSubscriptionDetails(subscriptionId, token) {
  const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

// 查询 Plan 详情
async function getPlanDetails(planId, token) {
  const response = await fetch(`${PAYPAL_API}/v1/billing/plans/${planId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

// 查询 Webhook 事件详情
async function getEventDetails(eventId, token) {
  const response = await fetch(`${PAYPAL_API}/v1/notifications/webhooks-events/${eventId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await response.json();
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.log('请在命令后输入 ID (例如: node scripts/query-paypal.js WH-XXX 或 I-XXX)');
    return;
  }

  try {
    console.log('🔑 正在获取 PayPal Access Token...');
    const token = await getAccessToken();

    for (const id of ids) {
      let subscriptionId = id;
      console.log(`\n--- 处理 ID: ${id} ---`);

      // 如果是 Webhook 事件 ID (WH-)，需要先获取事件详情
      if (id.startsWith('WH-')) {
        const event = await getEventDetails(id, token);
        if (event.resource && event.resource.id) {
          subscriptionId = event.resource.id;
          console.log(`解析到订阅 ID: ${subscriptionId} (${event.event_type})`);
        } else {
          console.error('❌ 无法从该事件中解析出订阅 ID，请确认 ID 是否正确。');
          continue;
        }
      }

      const sub = await getSubscriptionDetails(subscriptionId, token);
      
      if (sub.error || sub.name === 'RESOURCE_NOT_FOUND') {
        console.error('❌ 找不到该订阅 ID，可能订单已失效。');
        continue;
      }

      console.log(`当前状态: ${sub.status}`);
      console.log(`Plan ID: ${sub.plan_id}`);
      
      const plan = await getPlanDetails(sub.plan_id, token);
      console.log(`Plan 名称: ${plan.name}`);
      
      if (plan.billing_cycles && plan.billing_cycles[0]) {
        const pricing = plan.billing_cycles[0].pricing_scheme;
        if (pricing && pricing.fixed_price) {
          console.log(`金额: ${pricing.fixed_price.value} ${pricing.fixed_price.currency_code}`);
        }
      }
      
      console.log(`创建日期: ${sub.create_time}`);
    }
  } catch (error) {
    console.error('💥 发生错误:', error.message);
  }
}

main();
