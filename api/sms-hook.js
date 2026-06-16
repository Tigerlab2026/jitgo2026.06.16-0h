import { createHmac } from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({});
  }

  try {
    const body = req.body;
    console.log('[짓고 SMS Hook] body:', JSON.stringify(body));

    const phone = body?.phone
      || body?.user?.phone
      || body?.record?.phone
      || '';

    const otp = body?.otp
      || body?.token
      || body?.token_hash
      || '';

    console.log('[짓고 SMS Hook] phone:', phone, '/ otp:', otp);

    if (!phone || !otp) {
      console.error('[짓고 SMS Hook] 필드 없음:', JSON.stringify(body));
      return res.status(200).json({});
    }

    const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY;
    const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
    const SOLAPI_SENDER     = process.env.SOLAPI_SENDER;

    const date      = new Date().toISOString();
    const salt      = Math.random().toString(36).substring(2, 22);
    const message   = date + salt;

    const signature = createHmac('sha256', SOLAPI_API_SECRET)
      .update(message)
      .digest('hex');

    const authHeader = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;

    let to = phone.replace(/[^0-9]/g, '');
    if (to.startsWith('82')) to = '0' + to.slice(2);

    const solapiRes = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        message: {
          to,
          from: SOLAPI_SENDER,
          text: `[짓고] 인증번호 ${otp} 를 입력해 주세요.`,
        }
      })
    });

    const solapiData = await solapiRes.json();
    console.log('[짓고 SMS Hook] 솔라피 응답:', JSON.stringify(solapiData));

    return res.status(200).json({});

  } catch (err) {
    console.error('[짓고 SMS Hook] 오류:', err.message);
    return res.status(200).json({});
  }
}
