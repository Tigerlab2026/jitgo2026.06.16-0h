export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[짓고 SMS Hook] 전체 body:', JSON.stringify(req.body));

    const body = req.body;

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
      console.error('[짓고 SMS Hook] phone 또는 otp 없음. body:', JSON.stringify(body));
      return res.status(400).json({ error: 'phone and otp are required', received: body });
    }

    const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY;
    const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
    const SOLAPI_SENDER     = process.env.SOLAPI_SENDER;

    const date      = new Date().toISOString();
    const salt      = Math.random().toString(36).substring(2, 22);
    const message   = date + salt;

    const { createHmac } = await import('crypto');
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

    if (!solapiRes.ok) {
      console.error('[짓고 SMS Hook] 솔라피 오류:', JSON.stringify(solapiData));
      return res.status(500).json({ error: solapiData });
    }

    console.log('[짓고 SMS Hook] 발송 성공:', to);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[짓고 SMS Hook] 서버 오류:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
