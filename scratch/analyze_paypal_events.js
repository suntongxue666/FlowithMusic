const PAYPAL_CLIENT_ID = 'AQCCWaOGvX92tZI1uf4511x3WG1Hp2obxM4mTNgGX-pnUfObT2bnxfVMRHzSr2zTCycyx6jQtLLRdRx8';
const PAYPAL_SECRET = 'EHG_TGzQxZ6KyaogI1MjWYc_PhzlCFwa2-qrm3rBzOSAZFdgNcAtmrFVT6TeCQTlf-i2CYTmc2H2PjmK';
const EVENT_IDS = [
  'WH-650239855G7834153-0TX52612A1603991V',
  'WH-5CU61984R46098259-43448044VC5316429',
  'WH-9K246594TJ4236607-47730171R1998012B',
  'WH-6TT43516M02870811-9U406739XK879231A',
  'WH-4NM045699F523953P-50317917NK172072B',
  'WH-6T535737AS3228304-2SP76960AB678843P',
  'WH-0X3108174D1417354-44C209128N1855826',
  'WH-9HV79981JF370331M-5BM88057LR3043112',
  'WH-6SN19052MF0177033-60S51345W42988253',
  'WH-76635951KL724613V-34X095330V271420D',
  'WH-1R683702S25955022-8V53737507384543M',
  'WH-51E989299W950410C-39Y9671504105922U',
  'WH-1YV867064M233250H-5UH56948RH500125C',
  'WH-5HU55268J3473461Y-87J788788V385124E',
  'WH-3UC46043U7347680R-1TJ65470RB082231B',
  'WH-7FS19520HJ828763W-6NN47912414920005',
  'WH-19M36702PD7242258-6EP88231GD5105036',
  'WH-8RV515787S286842J-8BR06346NN120724N',
  'WH-4EY56480MK6649533-6AS62029JM363122X',
  'WH-6BH88745XX8401926-94B958800B6028548',
  'WH-0YY41663FA062031N-2EJ629675B974050H',
  'WH-4SE31744C8248553R-6M3811353X1333243',
  'WH-9ST03525WU978964K-2647801543873103N',
  'WH-1KT36817RW322971B-6RJ72707TF1413841',
  'WH-1XX15252EL062952H-2KN965343P385553X',
  'WH-2XE16624M4490292X-3DU01124DY125213V',
  'WH-1W813318LD279690M-6EU563873N762210D',
  'WH-03128126AE167930G-8D117974S11412116',
  'WH-8KK341430W278000E-62N53224LP860262D',
  'WH-6RP04580DL758873N-5R457610UY040814T',
  'WH-7LD11810RA390424C-78091342JN528440A',
  'WH-2NP46936RK360794E-73506801HW094691M',
  'WH-8N115095A1000174D-7RN77011HK049872G',
  'WH-6GU92069M3398131N-02M0780115725013R',
  'WH-4DR2428594992473R-7EP26968520934928',
  'WH-6GA4086320906735G-9KK40858LP826764E',
  'WH-8VM44431F4512813W-0FJ78270C7548824H',
  'WH-6WV17084J6946610A-67S24084RT126870M',
  'WH-0TR44264WL829060B-4SG53307DT8071944',
  'WH-59557403FA688535U-2LR83162H2843044H',
  'WH-26M45388H17817600-3W425695YW468745W',
  'WH-0XJ76007U09133922-62D33697NF1458146',
  'WH-46T66414XD232484U-6SY21429YG8677616',
  'WH-9M350301PF6322231-0AV097400M2783536',
  'WH-37434770899431023-47H32952D92190845',
  'WH-58X45755X8034501A-9EL24199MB616420C',
  'WH-576534684G743815U-07U88957HW391815W',
  'WH-14692085F59187922-7FU322571S289735E',
  'WH-1TC94504NS1325027-7CK643077F4445314',
  'WH-37542423AH604232K-26199223TD517762L',
  'WH-87E12972YN3252423-9NP639487M6514517',
  'WH-1G698247S2126132E-05S45102TM228835X',
  'WH-5SG3308580643571P-1VA92561594988848',
  'WH-0KE5733521750351K-2P635963SJ111230M',
  'WH-0U4266706A9999124-71D34072640174747',
  'WH-1DR562426X4083805-2E7240110A882240E',
  'WH-48F20034R2132684C-3SD866900B457844J',
  'WH-64L415767L674970S-2F906034UJ582683U',
  'WH-6DU86705YH1023547-10G19699VD8173120',
  'WH-8L054545TV949770A-6HH57857B95167230',
  'WH-40L34217UU127714S-6HV92320Y01205056',
  'WH-65826711UT6906530-55796351J8433345A',
  'WH-47V249047U467025B-31300434EE7158535',
  'WH-0VS986141L035791D-6WM300619S1363627',
  'WH-6AC028924E9422353-9UU530176J8779401',
  'WH-8NA94619PD3138335-4VU97295KK082942S',
  'WH-9916462353615130L-0DJ54424YF9517528'
];

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

async function getEventDetails(accessToken, eventId) {
  try {
    const response = await fetch(`https://api-m.paypal.com/v1/notifications/webhooks-events/${eventId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return { id: eventId, error: 'Not Found' };
      return { id: eventId, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const resource = data.resource || {};
    const summary = data.summary || '';
    
    return {
      id: eventId,
      eventType: data.event_type,
      summary: summary,
      planId: resource.plan_id || 'N/A',
      customId: resource.custom_id || resource.custom || 'N/A',
      status: resource.status || 'N/A',
      subscriberEmail: resource.subscriber?.email_address || 'N/A',
      subscriberName: resource.subscriber?.name?.full_name || 'N/A',
      createTime: data.create_time
    };
  } catch (e) {
    return { id: eventId, error: e.message };
  }
}

async function main() {
  console.log('🔑 Authenticating with PayPal...');
  const token = await getAccessToken();
  console.log('✅ Token obtained.');

  const results = [];
  const total = EVENT_IDS.length;
  
  console.log(`📡 Fetching ${total} events...`);
  
  // Process in chunks to avoid rate limits
  const CHUNK_SIZE = 5;
  for (let i = 0; i < EVENT_IDS.length; i += CHUNK_SIZE) {
    const chunk = EVENT_IDS.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map(id => getEventDetails(token, id));
    const chunkResults = await Promise.race([
        Promise.all(promises),
        new Promise((_, reject) => setTimeout(() => reject('Timeout'), 10000))
    ]).catch(() => chunk.map(id => ({ id, error: 'Timeout' })));
    
    results.push(...chunkResults);
    console.log(`⏳ Progress: ${Math.min(i + CHUNK_SIZE, total)}/${total}`);
  }

  // Analyze findings
  const analysis = {
    total: results.length,
    found: results.filter(r => !r.error).length,
    plans: {},
    emails: {},
    customIds: {},
    errors: results.filter(r => r.error).map(r => r.error)
  };

  results.forEach(r => {
    if (r.error) return;
    analysis.plans[r.planId] = (analysis.plans[r.planId] || 0) + 1;
    analysis.emails[r.subscriberEmail] = (analysis.emails[r.subscriberEmail] || 0) + 1;
    analysis.customIds[r.customId] = (analysis.customIds[r.customId] || 0) + 1;
  });

  console.log('\n--- PayPal Webhook Analysis ---');
  console.log('Total IDs Checked:', analysis.total);
  console.log('Events Successfully Fetched:', analysis.found);
  
  console.log('\nPlans Breakdown:');
  Object.entries(analysis.plans).forEach(([plan, count]) => {
    const price = plan === 'P-0E135132J93420229NG3WTWA' ? '$2.99 (Monthly)' : 
                  plan === 'P-0PU3781769776022HNG3WTWI' ? '$19.99 (Annual)' : plan;
    console.log(`- ${price}: ${count}`);
  });

  console.log('\nUnique Emails (Top 10):');
  Object.entries(analysis.emails)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([email, count]) => console.log(`- ${email}: ${count} subscriptions`));

  console.log('\nUnique Custom IDs (Top 10):');
  Object.entries(analysis.customIds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([id, count]) => console.log(`- ${id}: ${count} subscriptions`));

  if (analysis.errors.length > 0) {
    console.log('\nErrors encountered:', [...new Set(analysis.errors)]);
  }

  // Full raw results for debugging
  // console.log('\nRaw Results:', JSON.stringify(results, null, 2));
}

main().catch(console.error);
