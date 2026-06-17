// 국세청 사업자등록 진위확인 API 프록시
// 공공데이터포털: 국세청_사업자등록정보 진위확인 및 상태조회 서비스
// 환경변수: NTS_SERVICE_KEY (공공데이터포털 인증키, Decoding 키 사용)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { b_no, start_dt, p_nm } = req.body || {};
    // b_no: 사업자등록번호 (숫자 10자리)
    // start_dt: 개업일자 (YYYYMMDD)
    // p_nm: 대표자 성명

    if (!b_no || !start_dt || !p_nm) {
      return res.status(400).json({ error: '사업자번호·개업일자·대표자명이 필요합니다.' });
    }

    const SERVICE_KEY = process.env.NTS_SERVICE_KEY;
    if (!SERVICE_KEY) {
      return res.status(500).json({ error: '서버에 국세청 인증키가 설정되지 않았습니다.' });
    }

    const bNoClean = String(b_no).replace(/[^0-9]/g, '');

    // 국세청 진위확인 엔드포인트
    const url = 'https://api.odcloud.kr/api/nts-businessman/v1/validate?serviceKey='
      + encodeURIComponent(SERVICE_KEY);

    const body = {
      businesses: [
        {
          b_no: bNoClean,
          start_dt: String(start_dt).replace(/[^0-9]/g, ''),
          p_nm: p_nm,
        }
      ]
    };

    const ntsRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await ntsRes.json();

    if (!ntsRes.ok) {
      console.error('[국세청 진위확인] 오류:', JSON.stringify(data));
      return res.status(502).json({ error: '국세청 API 오류', detail: data });
    }

    // 결과 파싱
    const item = data?.data?.[0];
    const valid = item?.valid === '01'; // '01' = 일치, '02' = 불일치

    return res.status(200).json({
      valid,
      valid_code: item?.valid,
      status: item?.status,   // 사업자 상태 정보
      raw: item,
    });

  } catch (err) {
    console.error('[국세청 진위확인] 서버 오류:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
