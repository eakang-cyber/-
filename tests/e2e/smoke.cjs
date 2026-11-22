const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
  await p.goto(BASE + '/'); await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /무료로 내 인생 탐험하기/ }).first().click();
  await p.fill('#ob-name', '민지'); await p.getByRole('button', { name: '다음' }).click();
  await p.getByLabel('연도').fill('1990'); await p.getByLabel('월').fill('2'); await p.getByLabel('일').fill('30');
  await p.getByRole('button', { name: '다음' }).click();
  ok(await p.getByText('달력에 없는 날짜').isVisible(), 'invalid date 1990-02-30 rejected');
  await p.getByLabel('일').fill('4'); await p.getByRole('button', { name: '다음' }).click();
  await p.fill('#ob-time', '23:40'); await p.getByRole('button', { name: '다음' }).click();
  await p.selectOption('#ob-city', 'busan'); await p.getByRole('button', { name: '다음' }).click();
  await p.getByRole('radio', { name: '여성' }).click(); await p.getByRole('button', { name: '다음' }).click();
  ok(await p.getByText('23시대 출생').isVisible(), 'late-zi warning shown');
  await p.getByRole('button', { name: '내 인생 탐험 시작' }).click();
  await p.waitForTimeout(400);
  ok(p.url().endsWith('#me'), 'navigated to #me');
  ok(await p.getByText('민지님을 설명하는 첫 문장').isVisible(), 'character for new user');
  ok(!(await p.getByText(/가상의 예시 인물/).first().isVisible().catch(()=>false)), 'example banner hidden for own profile');
  // story tabs
  await p.getByRole('tab').nth(2).click(); ok(await p.getByRole('tab').nth(2).getAttribute('aria-selected') === 'true', 'story tab switch');
  // map
  await p.getByRole('button', { name: '인생 지도' }).last().click(); await p.waitForTimeout(300);
  await p.locator('#yr-2000').click(); await p.waitForTimeout(200);
  ok(await p.getByText('무엇이 포함되는지 보기').first().isVisible(), 'locked detail for 2000 in free');
  await p.fill('#q-title', '테스트 사건'); await p.getByRole('button', { name: '사건 기록' }).click();
  ok(await p.getByText('테스트 사건').isVisible(), 'quick record added on map');
  // relation consent
  await p.goto(BASE + '/#relation'); await p.waitForTimeout(300);
  await p.locator('input[type=checkbox]').first().check(); await p.waitForTimeout(200);
  ok(await p.getByText(/으로 읽힙니다/).first().isVisible(), 'pair results after consent');
  // premium purchase
  await p.goto(BASE + '/#premium'); await p.waitForTimeout(300);
  const boxes = p.locator('input[type=checkbox]'); await boxes.last().check();
  await p.getByRole('button', { name: /모의 결제/ }).click(); await p.waitForTimeout(1500);
  ok(p.url().endsWith('#report'), 'demo purchase -> report');
  ok(await p.getByRole('button', { name: '리포트 저장 (데모)' }).isVisible(), 'demo label visible on report');
  await p.goto(BASE + '/#map'); await p.waitForTimeout(300);
  await p.locator('#yr-2000').click(); await p.waitForTimeout(200);
  ok(await p.getByText('리포트 · 연도별 해석').isVisible(), 'premium unlocks 2000 detail');
  // archive delete
  await p.goto(BASE + '/#archive'); await p.waitForTimeout(300);
  const before = await p.getByRole('button', { name: '삭제', exact: true }).count();
  await p.getByRole('button', { name: '삭제', exact: true }).first().click(); await p.waitForTimeout(200);
  await p.getByText('이 기록을 삭제할까요?').locator('..').getByRole('button', { name: '삭제', exact: true }).click(); await p.waitForTimeout(200);
  const after = await p.getByRole('button', { name: '삭제', exact: true }).count();
  ok(after === before - 1, `archive delete (${before} -> ${after})`);
  // 내 정보 입력 후 예시 기록이 섞이지 않는다
  ok(!(await p.getByText('첫 독립 생활 시작').isVisible().catch(()=>false)), 'example records removed for own profile');
  // 베타 피드백
  await p.goto(BASE + '/#feedback'); await p.waitForTimeout(300);
  await p.getByRole('radio', { name: '4' }).first().click();
  await p.getByRole('radio', { name: '인생 지도' }).click();
  await p.getByRole('radio', { name: '할인·이벤트가 있으면 결제' }).click();
  await p.getByRole('button', { name: '의견 정리하기' }).click();
  await p.getByRole('button', { name: '글로 보기' }).click();
  const fb = await p.getByLabel('의견 요약').inputValue();
  ok(fb.includes('마스터 리포트(9,900원) 모의 결제 누름: 예') && fb.includes('내 생년월일로 봤나: 예') && !fb.includes('1990'), 'feedback summary has signals, no birth data');
  console.log('errors', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.log('CRASH', e.message); process.exit(1); });
