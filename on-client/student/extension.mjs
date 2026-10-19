// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// ---------- 13단계: renderIdentity 보조 ----------

const DEVICE_STATUS_LABELS = Object.freeze({
  compliant: '보안 기준 충족',
  noncompliant: '보안 기준 미충족',
  unknown: '확인 불가',
});

const SESSION_STATUS_LABELS = Object.freeze({
  active: '활성',
  expired: '만료',
  revoked: '철회됨',
  unknown: '확인 불가',
});

// 정상으로 볼 수 있는 값만 ok, 확인 불가는 empty, 나머지는 error 색으로 표시한다.
// 색만으로 구분하지 않도록 문구에도 상태를 그대로 적는다.
const DEVICE_TONE = Object.freeze({ compliant: 'ok', noncompliant: 'error', unknown: 'empty' });
const SESSION_TONE = Object.freeze({ active: 'ok', expired: 'error', revoked: 'error', unknown: 'empty' });

const MODE_NOTICES = Object.freeze({
  demo: '예제 자료',
  disconnected: '연결 없음',
  unknown: '확인 불가',
});

const RESOURCE_NAMES = Object.freeze({ me: '내 계정', devices: '내 기기 목록', sessions: '내 로그인 세션 목록' });

function node(tag, text, className) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = String(text);
  return element;
}

function textOf(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function deviceStatusText(status) {
  const label = DEVICE_STATUS_LABELS[status] || DEVICE_STATUS_LABELS.unknown;
  return `${label} (${textOf(status) || 'unknown'})`;
}

function sessionStatusText(status) {
  const label = SESSION_STATUS_LABELS[status] || SESSION_STATUS_LABELS.unknown;
  return `${label} (${textOf(status) || 'unknown'})`;
}

function statusBadge(text, tone, status) {
  const badge = node('span', text, `state state-${tone}`);
  badge.dataset.status = textOf(status) || 'unknown';
  return badge;
}

function deviceBadge(status) {
  return statusBadge(deviceStatusText(status), DEVICE_TONE[status] || 'empty', status);
}

function sessionBadge(status) {
  return statusBadge(sessionStatusText(status), SESSION_TONE[status] || 'empty', status);
}

function addRow(list, term, ...values) {
  list.append(node('dt', term));
  const dd = document.createElement('dd');
  for (const value of values) dd.append(value instanceof Node ? value : String(value));
  list.append(dd);
}

// loading·error·알 수 없는 상태를 공통으로 처리한다. ok이면 null을 돌려준다.
function resourceStateBox(name, resource) {
  const status = resource && resource.status;
  if (status === 'ok') return null;
  if (status === 'loading') {
    const box = node('p', `${RESOURCE_NAMES[name]}: 불러오는 중`, 'state state-loading');
    box.setAttribute('role', 'status');
    return box;
  }
  if (status === 'error') {
    const message = textOf(resource.error && resource.error.message) || '서버가 오류 내용을 보내지 않았습니다.';
    return node('p', `${RESOURCE_NAMES[name]} 연결 실패: ${message}`, 'state state-error');
  }
  const box = node('p', `${RESOURCE_NAMES[name]}: 아직 불러오지 않았거나 확인 불가`, 'state state-empty');
  box.setAttribute('role', 'status');
  return box;
}

function renderModeNotices(resources) {
  const modes = new Set();
  for (const resource of resources) {
    const mode = resource && resource.mode;
    if (mode === 'demo' || mode === 'disconnected' || mode === 'unknown') modes.add(mode);
  }
  if (!modes.size) return null;
  const wrap = node('p', null, 'identity-mode');
  for (const mode of modes) {
    const tag = node('span', MODE_NOTICES[mode], mode === 'demo' ? 'tag tag-demo' : 'state state-empty');
    tag.dataset.mode = mode;
    wrap.append(tag, ' ');
  }
  return wrap;
}

function renderMe(me) {
  const section = node('section', null, 'identity-me');
  section.append(node('h3', '현재 로그인'));
  const stateBox = resourceStateBox('me', me);
  // 오류·로딩일 때는 사용자·기기·세션 값을 하나도 그리지 않는다(이전 값이 남지 않음).
  if (stateBox) return section.append(stateBox), section;

  const data = me.data || {};
  const user = data.user || {};
  const device = data.device || {};
  const session = data.session || {};
  if (!textOf(user.id) && !textOf(user.label)) {
    section.append(node('p', '내 계정: 응답에 사용자 정보가 없어 확인 불가', 'state state-empty'));
    return section;
  }
  const list = node('dl', null, 'identity-list');
  addRow(list, '사용자', `${textOf(user.label) || '이름 없음'} (${textOf(user.id) || 'ID 없음'})`);
  addRow(list, '현재 기기', `${textOf(device.label) || '이름 없음'} (${textOf(device.id) || 'ID 없음'}) `, deviceBadge(device.status));
  addRow(list, '현재 세션', `${textOf(session.id) || 'ID 없음'} `, sessionBadge(session.status));
  section.append(list);
  return section;
}

function renderList(name, resource, title, emptyText, renderItem) {
  const section = node('section', null, `identity-${name}`);
  section.append(node('h3', title));
  const stateBox = resourceStateBox(name, resource);
  if (stateBox) return section.append(stateBox), section;
  const items = Array.isArray(resource.data) ? resource.data : null;
  if (!items) {
    section.append(node('p', `${RESOURCE_NAMES[name]}: 응답 형식을 확인할 수 없어 확인 불가`, 'state state-empty'));
    return section;
  }
  if (!items.length) {
    section.append(node('p', emptyText, 'state state-empty'));
    return section;
  }
  const list = node('ul', null, 'identity-items');
  for (const item of items) list.append(renderItem(item || {}));
  section.append(list);
  return section;
}

function renderDeviceItem(device) {
  const li = document.createElement('li');
  li.append(`${textOf(device.label) || '이름 없음'} (${textOf(device.id) || 'ID 없음'}) `, deviceBadge(device.status));
  return li;
}

function renderSessionItem(session) {
  const li = document.createElement('li');
  li.append(`${textOf(session.id) || 'ID 없음'} `, sessionBadge(session.status));
  return li;
}

// 호출될 때마다 새 DOM을 만든다. 모듈 안에 이전 값을 저장하지 않으므로
// 다시 불러오기로 새 값이 오면 통째로 교체되고, 오류일 때 옛 사용자 이름이 남지 않는다.
function renderIdentity(input) {
  const { me, devices, sessions } = input || {};
  const root = node('div', null, 'student-identity-view');
  root.dataset.view = 'identity';
  const notices = renderModeNotices([me, devices, sessions]);
  if (notices) root.append(notices);
  root.append(
    renderMe(me),
    renderList('devices', devices, '내 기기', '등록된 기기가 없습니다.', renderDeviceItem),
    renderList('sessions', sessions, '내 로그인 세션', '로그인 세션이 없습니다.', renderSessionItem),
  );
  return root;
}

// ---------- 14단계: renderDecision 보조 ----------

const DECISION_INFO = Object.freeze({
  allow: { label: '접근 허용', tone: 'ok', note: '정책상 접근이 허용되었습니다. 실제 앱 접속 성공을 보장하지는 않습니다.' },
  deny: { label: '접근 거부', tone: 'error', note: '서버 정책에 따라 이 앱 접근이 거부되었습니다.' },
  challenge: { label: '추가 인증 또는 확인 필요', tone: 'loading', note: '서버가 추가 확인을 요구했습니다. 이 앱이 추가 인증 절차를 대신 수행하지 않습니다.' },
  unknown: { label: '판정 확인 불가', tone: 'empty', note: '서버 판정을 확인할 수 없습니다. 접근이 허용되지 않은 것으로 보고, 허용으로 간주하지 마세요.' },
});

function formatCheckedAt(value) {
  const text = textOf(value);
  if (!text) return '판정 시각 정보 없음';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : `${date.toLocaleString('ko-KR')} (${text})`;
}

function decisionHeadline(text, tone, decisionAttr) {
  const line = node('p', null, `state state-${tone}`);
  line.append(node('strong', text));
  line.dataset.decision = decisionAttr;
  return line;
}

// 호출될 때마다 새 DOM을 만든다. 이전 판정을 저장하지 않으므로 새 요청 결과로 통째로 교체된다.
function renderDecision(input) {
  const { status, mode, data, error, appId } = input || {};
  const root = node('div', null, 'student-decision-view');
  root.dataset.view = 'decision';
  const notices = renderModeNotices([{ mode }]);
  if (notices) root.append(notices);

  if (status === 'idle') {
    root.dataset.decision = 'none';
    root.append(node('p', '앱을 골라 접속을 요청하세요. 아직 요청한 앱이 없습니다.', 'state state-empty'));
    return root;
  }
  if (status === 'loading') {
    root.dataset.decision = 'pending';
    const box = node('p', `판정 확인 중: ${textOf(appId) || '선택한 앱'}`, 'state state-loading');
    box.setAttribute('role', 'status');
    root.append(box);
    return root;
  }
  if (status === 'error') {
    // 요청 실패는 서버가 내린 판정이 아니다. 거부·허용 어느 쪽으로도 표시하지 않는다.
    root.dataset.decision = 'request-failed';
    const message = textOf(error && error.message) || '서버가 오류 내용을 보내지 않았습니다.';
    root.append(
      decisionHeadline(`요청 실패: ${message}`, 'error', 'request-failed'),
      node('p', `대상 앱: ${textOf(appId) || '앱 정보 없음'}`),
      node('p', '이것은 접근 거부 판정이 아니며, 접근이 허용된 것도 아닙니다. 필요하면 직접 다시 요청하세요.'),
    );
    return root;
  }
  if (status !== 'ok') {
    root.dataset.decision = 'unknown';
    root.append(decisionHeadline('판정 확인 불가(unknown): 요청 상태를 확인할 수 없습니다. 허용되지 않음', 'empty', 'unknown'));
    return root;
  }

  const result = data || {};
  const raw = textOf(result.decision);
  const known = Object.hasOwn(DECISION_INFO, raw || '') ? raw : null;
  const info = DECISION_INFO[known || 'unknown'];
  const code = known || 'unknown';
  root.dataset.decision = code;
  const headline = known
    ? `${info.label}(${code})`
    : `${info.label}(unknown) · 서버가 보낸 값: ${raw || '값 없음'}`;
  const list = node('dl', null, 'decision-list');
  addRow(list, '대상 앱', textOf(result.appId) || textOf(appId) || '앱 정보 없음');
  addRow(list, '판정 이유', textOf(result.reason) || '판정 이유 정보 없음');
  addRow(list, '판정 시각', formatCheckedAt(result.checkedAt));
  root.append(decisionHeadline(headline, info.tone, code), node('p', info.note), list);
  return root;
}

export function createStudentView() {
  return {
    renderIdentity,
    renderDecision,
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
