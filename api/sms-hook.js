export default async function handler(req, res) {
  // GET 요청 차단
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { phone, otp } = req.body;
 
    if (!phone || !otp) {
      return res.status(400).json({ error: 'phone and otp are required' });
    }
 
    // 솔라피 API 키
    const SOLAPI_API_KEY    = process.env.SOLAPI_API_KEY;
    const SOLAPI_API_SECRET = process.env.SOLAPI_API_SECRET;
    const SOLAPI_SENDER     = process.env.SOLAPI_SENDER; // 등록된 발신번호 (예: 01092816533)
 
    // 인증 헤더 생성 (HMAC-SHA256)
    const date      = new Date().toISOString();
    const salt      = Math.random().toString(36).substring(2, 22);
    const message   = date + salt;
 
    const { createHmac } = await import('crypto');
    const signature = createHmac('sha256', SOLAPI_API_SECRET)
      .update(message)
      .digest('hex');
 
    const authHeader = `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`;
 
    // 수신번호 정규화 (E.164 → 국내형식)
    let to = phone.replace(/[^0-9]/g, '');
    if (to.startsWith('82')) to = '0' + to.slice(2);
 
    // 솔라피 SMS 발송
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
      console.error('[짓고 SMS Hook] 솔라피 오류:', solapiData);
      return res.status(500).json({ error: solapiData });
    }
 
    console.log('[짓고 SMS Hook] 발송 성공:', to);
    return res.status(200).json({ success: true });
 
  } catch (err) {
    console.error('[짓고 SMS Hook] 서버 오류:', err);
    return res.status(500).json({ error: err.message });
  }
}
