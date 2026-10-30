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
  // 위아래 글자와 겹치지 않도록 줄 높이 안에 자리를 잡게 한다.
  badge.style.display = 'inline-block';
  badge.style.margin = '2px 0';
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

// ---------- 15단계: renderEvents 보조 ----------

const EVENT_KIND_LABELS = Object.freeze({ access: '접속 기록', xdr: 'XDR 경보' });

const ACCESS_STATE_LABELS = Object.freeze({ allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' });
const ACCESS_STATE_TONE = Object.freeze({ allowed: 'ok', denied: 'error', unknown: 'empty' });

const UNVERIFIED_CODES = Object.freeze(['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED']);

// 앱 ID가 없는 옛 기록을 고르기 위한 필터 값. 실제 appId와 겹치지 않도록 빈 문자열을 쓴다.
const NO_APP_VALUE = '';

function eventKindText(kind) {
  const raw = textOf(kind) || 'unknown';
  return EVENT_KIND_LABELS[raw] ? `${EVENT_KIND_LABELS[raw]}(${raw})` : `확인 불가(${raw})`;
}

function eventAppText(appId) {
  return textOf(appId) || '앱 확인 불가(appId 없음)';
}

function eventTimeText(at) {
  const text = textOf(at);
  if (!text) return '시각 정보 없음';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : `${date.toLocaleString('ko-KR')} (${text})`;
}

function eventTimeValue(at) {
  const time = Date.parse(textOf(at) || '');
  return Number.isNaN(time) ? -Infinity : time;
}

function accessStateBadge(status) {
  const raw = textOf(status) || 'unknown';
  const label = ACCESS_STATE_LABELS[raw] || ACCESS_STATE_LABELS.unknown;
  return statusBadge(`${label} (${raw})`, ACCESS_STATE_TONE[raw] || 'empty', raw);
}

function filterOptionLabel(name, value) {
  if (name === 'kind') return eventKindText(value);
  if (name === 'app') return value === NO_APP_VALUE ? '앱 확인 불가(appId 없음)' : value;
  const raw = textOf(value) || 'unknown';
  return `${ACCESS_STATE_LABELS[raw] || '확인 불가'}(${raw})`;
}

function eventFilterValue(name, event) {
  if (name === 'kind') return textOf(event.kind) || 'unknown';
  if (name === 'app') return textOf(event.appId) || NO_APP_VALUE;
  return textOf(event.state && event.state.access) || 'unknown';
}

const EVENT_FILTERS = Object.freeze([
  { name: 'kind', label: '기록 종류' },
  { name: 'app', label: '업무 앱' },
  { name: 'access', label: '접속 상태' },
]);

function renderTextRows(title, rows) {
  const block = node('div', null, 'event-detail-block');
  block.append(node('h4', title));
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) {
    block.append(node('p', `${title} 없음`));
    return block;
  }
  const list = document.createElement('ul');
  for (const row of items) {
    const item = row || {};
    list.append(node('li', `${textOf(item.id) || 'ID 없음'}: ${textOf(item.text) || '내용 없음'}`));
  }
  block.append(list);
  return block;
}

function renderEventDetail(event) {
  const detail = node('section', null, 'event-detail');
  const id = textOf(event.id) || 'ID 없음';
  detail.dataset.studentEventDetail = id;
  detail.setAttribute('aria-label', `${id} 상세 내용`);
  detail.append(node('h4', `${id} 상세`));
  const info = node('dl', null, 'event-detail-list');
  addRow(info, '사건 ID', id);
  addRow(info, '업무 앱', eventAppText(event.appId));
  detail.append(info);
  detail.append(renderTextRows('근거(evidence)', event.evidence), renderTextRows('규칙(rules)', event.rules));
  const state = event.state || {};
  const states = node('dl', null, 'event-detail-state');
  addRow(states, '접속 상태(state.access)', accessStateBadge(state.access));
  addRow(states, '세션 상태(state.session)', sessionBadge(state.session));
  addRow(states, '기기 상태(state.device)', deviceBadge(state.device));
  detail.append(node('h4', '상태'), states);
  const actions = Array.isArray(event.supportedActions)
    ? event.supportedActions.map((action) => textOf(action)).filter(Boolean)
    : [];
  // 실제 목록처럼 supportedActions가 비어 있으면 아무 버튼도 만들지 않는다.
  if (actions.length) detail.append(renderUnsupportedActions(actions));
  return detail;
}

// 16단계: 연결되지 않은 조치는 요청을 보내지 않는 비활성 안내 버튼으로만 보여 준다.
function renderUnsupportedActions(actions) {
  const block = node('div', null, 'event-detail-actions');
  block.append(
    node('h4', '조치'),
    node('p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 아래 버튼은 어떤 요청도 보내지 않습니다.', 'state state-empty'),
  );
  for (const action of actions) {
    const button = node('button', `${action} 미지원`, 'btn');
    button.type = 'button';
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.dataset.unsupportedAction = action;
    block.append(button, ' ');
  }
  return block;
}

// 필터와 상세 선택은 이 함수 안에만 둔다. 서버에 다시 묻지 않고 받은 배열 안에서만 거른다.
function createEventsRenderer() {
  let view = { kind: 'all', app: 'all', access: 'all', selectedId: null };

  function resetView() {
    view = { kind: 'all', app: 'all', access: 'all', selectedId: null };
  }

  return function renderEvents(input) {
    const { status, mode, data, error } = input || {};
    const root = node('div', null, 'student-events-view');
    root.dataset.view = 'events';
    const notices = renderModeNotices([{ mode }]);
    if (notices) root.append(notices);

    if (status !== 'ok') {
      // 다시 불러오기·실패·확인 불가에서는 이전 필터와 상세 선택을 모두 초기화한다.
      resetView();
      if (status === 'loading') {
        const box = node('p', '보안 기록 불러오는 중', 'state state-loading');
        box.setAttribute('role', 'status');
        root.append(box);
      } else if (status === 'error') {
        const message = textOf(error && error.message) || '서버가 오류 내용을 보내지 않았습니다.';
        const code = textOf(error && error.code);
        if (code && UNVERIFIED_CODES.includes(code)) {
          root.append(
            node('p', `확인 불가(unknown): ${message}`, 'state state-error'),
            node('p', '서버 응답 형식을 확인할 수 없어 이전 목록을 표시하지 않습니다. 기록이 없다는 뜻이 아닙니다.'),
          );
        } else {
          root.append(
            node('p', `기록을 불러오지 못했습니다: ${message}`, 'state state-error'),
            node('p', '조회에 실패한 것이며, 기록이 없다는 뜻이 아닙니다. 필요하면 다시 불러오기를 누르세요.'),
          );
        }
      } else {
        root.append(node('p', '보안 기록: 아직 불러오지 않았거나 확인 불가', 'state state-empty'));
      }
      return root;
    }

    if (!Array.isArray(data)) {
      resetView();
      root.append(node('p', '확인 불가(unknown): 기록 목록 형식을 확인할 수 없습니다.', 'state state-error'));
      return root;
    }

    root.append(node('p', '본인의 최근 보안 기록(최대 40건)입니다. 모든 직원의 전체 이력이나 실시간 전체 위협 탐지 결과가 아닙니다.', 'muted'));

    if (!data.length) {
      resetView();
      const empty = node('p', '표시할 기록이 없습니다. 조회는 완료되었고, 조회 범위 안에 기록이 0건입니다.', 'state state-empty');
      empty.setAttribute('role', 'status');
      root.append(empty);
      return root;
    }

    // 받은 배열은 복사해서 정렬한다. 원본 배열과 기록 객체는 바꾸지 않는다.
    const events = [...data].filter((event) => event && typeof event === 'object')
      .sort((a, b) => eventTimeValue(b.at) - eventTimeValue(a.at));

    const filterBar = node('div', null, 'event-filters');
    for (const filter of EVENT_FILTERS) {
      const values = [...new Set(events.map((event) => eventFilterValue(filter.name, event)))];
      if (view[filter.name] !== 'all' && !values.includes(view[filter.name])) view[filter.name] = 'all';
      const id = `student-event-filter-${filter.name}`;
      const label = node('label', `${filter.label} `);
      label.setAttribute('for', id);
      const select = document.createElement('select');
      select.id = id;
      select.setAttribute('aria-label', filter.label);
      select.dataset.studentEventFilter = filter.name;
      const all = node('option', '전체(all)');
      all.value = 'all';
      select.append(all);
      for (const value of values) {
        const option = node('option', filterOptionLabel(filter.name, value));
        option.value = value;
        select.append(option);
      }
      select.value = view[filter.name];
      select.addEventListener('change', () => {
        view[filter.name] = select.value;
        drawList();
      });
      label.append(select);
      filterBar.append(label, ' ');
    }

    const listArea = node('div', null, 'event-list-area');
    root.append(filterBar, listArea);

    function drawList(focusId) {
      const shown = events.filter((event) => EVENT_FILTERS.every((filter) =>
        view[filter.name] === 'all' || eventFilterValue(filter.name, event) === view[filter.name]));
      if (view.selectedId && !shown.some((event) => event.id === view.selectedId)) view.selectedId = null;

      const count = node('p', `표시 ${shown.length}건 / 받은 기록 ${events.length}건`);
      count.setAttribute('role', 'status');
      if (!shown.length) {
        listArea.replaceChildren(count, node('p', '선택한 필터에 맞는 기록이 없습니다. 필터를 전체(all)로 바꾸면 다시 보입니다.', 'state state-empty'));
        return;
      }
      const list = node('ul', null, 'event-list');
      let focusTarget = null;
      for (const event of shown) {
        const id = textOf(event.id) || 'ID 없음';
        const item = document.createElement('li');
        item.dataset.studentEventId = id;
        const summary = node('p', null, 'event-row');
        summary.append(
          node('strong', `[${eventKindText(event.kind)}] `),
          `${id} · ${eventTimeText(event.at)} · 앱 ${eventAppText(event.appId)} · ${textOf(event.summary) || '요약 없음'} `,
        );
        const opened = view.selectedId === event.id;
        const button = node('button', `${id} 상세`, 'btn');
        button.type = 'button';
        button.setAttribute('aria-expanded', opened ? 'true' : 'false');
        button.addEventListener('click', () => {
          view.selectedId = view.selectedId === event.id ? null : event.id;
          drawList(event.id);
        });
        if (focusId === event.id) focusTarget = button;
        summary.append(button);
        item.append(summary);
        if (opened) item.append(renderEventDetail(event));
        list.append(item);
      }
      listArea.replaceChildren(count, list);
      if (focusTarget) focusTarget.focus();
    }

    drawList();
    return root;
  };
}

// ---------- 16단계: renderStatus 보조 ----------

const STATUS_RESOURCE_NAMES = Object.freeze({
  me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '기기', sessions: '세션',
  access: '접속 판정', diagnostics: '도움정보', vulnerabilities: '패키지 취약점',
});

const SECRET_PATTERN = /(?:Bearer\s+\S+|sk-(?:proj-|ant-|svcacct-)?[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(?:api[_ -]?key|authorization|password|passwd|secret|token|비밀번호|토큰)\s*[:=]\s*\S+)/i;
const SAFE_CODE = /^[A-Za-z0-9_.:-]{1,64}$/;

// 화면과 복사 내용에 비밀처럼 보이는 값이 섞이지 않게 한다.
function safeText(value, max = 300) {
  const text = textOf(typeof value === 'number' ? String(value) : value);
  if (!text) return null;
  if (SECRET_PATTERN.test(text)) return '[비밀로 보이는 값이라 가렸습니다]';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function safeCode(value) {
  const text = textOf(value);
  return text && SAFE_CODE.test(text) ? text : '코드 확인 불가';
}

function statusResourceName(resource) {
  const raw = textOf(resource) || 'unknown';
  return `${STATUS_RESOURCE_NAMES[raw] || '알 수 없는 자료'}(${safeCode(raw)})`;
}

const RETRY_GUIDE = '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

// 기기·세션 공통: 불러오는 중·실패·시간 초과·확인 불가를 서로 다른 문장으로 보여 준다.
function statusFailureBox(name, resource) {
  const code = textOf(resource.error && resource.error.code);
  const message = safeText(resource.error && resource.error.message) || '서버가 오류 내용을 보내지 않았습니다.';
  const wrap = node('div', null, 'status-failure');
  wrap.dataset.statusResult = 'error';
  if (code && /TIMEOUT/.test(code)) {
    wrap.append(node('p', `${name}: 시간 초과로 불러오지 못했습니다. ${message}`, 'state state-error'));
  } else if (code && UNVERIFIED_CODES.includes(code)) {
    wrap.append(node('p', `${name}: 확인 불가(응답 형식 불일치). ${message}`, 'state state-error'));
  } else {
    wrap.append(node('p', `${name} 자료를 불러오지 못했습니다: ${message}`, 'state state-error'));
  }
  wrap.append(node('p', RETRY_GUIDE));
  return wrap;
}

function renderStatusList(title, resource, emptyText, renderItem, note) {
  const section = node('section', null, 'status-section');
  section.append(node('h3', title));
  if (note) section.append(node('p', note, 'muted'));
  const status = resource && resource.status;
  if (status === 'loading') {
    const box = node('p', `${title}: 불러오는 중`, 'state state-loading');
    box.setAttribute('role', 'status');
    section.append(box);
  } else if (status === 'error') {
    section.append(statusFailureBox(title, resource));
  } else if (status === 'ok' && Array.isArray(resource.data)) {
    if (!resource.data.length) {
      const empty = node('p', emptyText, 'state state-empty');
      empty.dataset.statusResult = 'empty';
      section.append(empty);
    } else {
      const list = document.createElement('ul');
      for (const item of resource.data) list.append(renderItem(item || {}));
      section.append(list);
    }
  } else {
    section.append(node('p', `${title}: 아직 불러오지 않았거나 확인 불가`, 'state state-empty'));
  }
  return section;
}

function renderNotifications(notifications) {
  const section = node('section', null, 'status-notifications');
  section.append(node('h3', '알림'));
  const items = Array.isArray(notifications) ? notifications : [];
  if (!items.length) {
    section.append(node('p', '주의할 알림이 없습니다.', 'state state-ok'));
    return section;
  }
  section.append(node('p', `주의할 알림 ${items.length}건`));
  const list = document.createElement('ul');
  for (const entry of items) {
    const item = entry || {};
    const li = document.createElement('li');
    li.append(
      node('strong', `[${statusResourceName(item.resource)}] `),
      `코드 ${safeCode(item.code)} · ${safeText(item.message) || '내용 없음'}`,
    );
    list.append(li);
  }
  section.append(list);
  return section;
}

const DIAGNOSTIC_FIELDS = Object.freeze([
  ['requestId', (d) => d.requestId],
  ['component', (d) => d.component],
  ['version', (d) => d.version],
  ['checkedAt', (d) => d.checkedAt],
  ['engine.mode', (d) => d.engine && d.engine.mode],
  ['engine.code', (d) => d.engine && d.engine.code],
]);

// 허용한 여섯 값만 뽑는다. 그 밖의 필드는 화면에도 복사 내용에도 넣지 않는다.
function pickDiagnostics(data) {
  const source = data && typeof data === 'object' ? data : {};
  return DIAGNOSTIC_FIELDS.map(([name, read]) => [name, safeText(read(source), 120) || '값 없음']);
}

function createStatusRenderer(context = {}) {
  let copyNote = null;
  let copiedFor = null;

  return function renderStatus(input) {
    const { devices, sessions, notifications, diagnostics, mode } = input || {};
    const root = node('div', null, 'student-status-view');
    root.dataset.view = 'status';
    const notices = renderModeNotices([{ mode }]);
    if (notices) root.append(notices);

    root.append(
      renderNotifications(notifications),
      renderStatusList('기기', devices, '등록된 기기가 없습니다.', (device) => {
        const li = document.createElement('li');
        li.append(`${textOf(device.label) || '이름 없음'} (${textOf(device.id) || 'ID 없음'}) `, deviceBadge(device.status));
        return li;
      }),
      renderStatusList('세션', sessions, '현재 연결 없음: 검증된 연결이 없습니다.', (session) => {
        const li = document.createElement('li');
        li.append(`${textOf(session.id) || 'ID 없음'} `, sessionBadge(session.status));
        return li;
      }, '세션은 지금 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.'),
    );

    const diag = node('section', null, 'status-diagnostics');
    diag.append(node('h3', '도움정보'));
    const status = diagnostics && diagnostics.status;
    const fields = status === 'ok' ? pickDiagnostics(diagnostics.data) : null;
    const copyText = fields ? fields.map(([name, value]) => `${name}: ${value}`).join('\n') : '';
    if (copiedFor !== copyText) { copyNote = null; copiedFor = null; }

    if (status === 'loading') {
      diag.append(node('p', '도움정보: 불러오는 중', 'state state-loading'));
    } else if (status === 'error') {
      const message = safeText(diagnostics.error && diagnostics.error.message) || '서버가 오류 내용을 보내지 않았습니다.';
      diag.append(
        node('p', `도움정보를 불러오지 못했습니다: ${message}`, 'state state-error'),
        node('p', '다시 시도는 제공 「도움정보」 칸의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.'),
      );
    } else if (fields) {
      const list = node('dl', null, 'diagnostics-list');
      for (const [name, value] of fields) addRow(list, name, value);
      diag.append(
        list,
        node('p', '이 값은 checkedAt 시각에 마지막으로 불러온 도움정보입니다. 지금 연결 상태와 다를 수 있으니, 최신 값이 필요하면 「도움정보 불러오기」를 직접 다시 누르세요.', 'muted'),
      );
    } else {
      diag.append(node('p', '도움정보를 아직 불러오지 않았습니다. 제공 「도움정보」 칸의 「도움정보 불러오기」 버튼을 누르면 여기에 표시됩니다.', 'state state-empty'));
    }

    diag.append(node('p', '「도움정보 복사」는 강사나 담당자에게 도움을 요청할 때 붙여 넣을 정보를 복사합니다. 위 여섯 값만 복사하며, 비밀번호·토큰·API 키는 넣지 않습니다. 버튼을 누를 때만 복사합니다.', 'muted'));
    const copyButton = node('button', '도움정보 복사', 'btn');
    copyButton.type = 'button';
    copyButton.disabled = !copyText;
    if (!copyText) copyButton.setAttribute('aria-disabled', 'true');
    const note = node('p', copyNote || (copyText ? '' : '도움정보를 먼저 불러와야 복사할 수 있습니다.'));
    note.setAttribute('role', 'status');
    const showNote = (text) => {
      copyNote = text;
      copiedFor = copyText;
      note.textContent = text;
      if (typeof context.onChange === 'function') context.onChange();
    };
    copyButton.addEventListener('click', async () => {
      if (!copyText) return;
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('clipboard');
        await navigator.clipboard.writeText(copyText);
        showNote('도움정보 여섯 값을 클립보드에 복사했습니다. 붙여 넣기 전에 내용을 직접 확인하세요.');
      } catch {
        showNote('자동 복사를 사용할 수 없습니다. 위에 보이는 여섯 값을 직접 선택해 Ctrl+C로 복사하세요.');
      }
    });
    diag.append(copyButton, note);
    root.append(diag);
    return root;
  };
}

// ---------- 17단계: renderAiConnection·renderExplanation 보조 ----------

const AI_MANUAL_RETRY = '다시 점검은 「AI 연결 점검」 버튼(연결 완료 뒤에는 「현재 API 연결 점검」도 같은 점검)을 직접 누르세요. 자동으로 다시 점검하지 않습니다.';

// 안전한 error.code로 원인을 나눈다. 원문 오류나 열쇠는 쓰지 않는다.
const AI_ERROR_GROUPS = Object.freeze([
  { kind: 'provisioning', title: '권한 준비 중·확인 불가', codes: ['ON_AI_PROVISIONING_PENDING', 'ON_AI_AUTHORIZATION_CHANGED'],
    guide: '학생 잘못이 아닙니다. 담당자에게 계정 연결과 앱 이용 권한 확인을 요청하세요.' },
  { kind: 'auth', title: '인증 실패', codes: ['WB_CLCO_AUTH_REQUIRED'],
    guide: '보호 현황의 계정 연결 확인과 AI 연결 승인을 다시 확인하고, 계속되면 담당자에게 확인하세요. 열쇠를 복사해 붙이지 마세요.' },
  { kind: 'access', title: '접근 제한', codes: ['WB_CLCO_ACCESS_BLOCKED'],
    guide: '계정 연결을 다시 확인하고, 앱 이용 권한은 담당자에게 확인하세요.' },
  { kind: 'limit', title: '사용량·이용 한도 초과', codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'],
    guide: '반 사용량이나 이용 한도는 학생 코드로 바꿀 수 없습니다. 담당자에게 확인하세요.' },
  { kind: 'session', title: '이용 시간 아님', codes: ['WB_CLCO_SESSION_CLOSED'],
    guide: '현재 AI 이용 시간이 아닙니다. 이용 시간을 확인한 뒤 직접 다시 점검하세요.' },
  { kind: 'rate', title: '요청 제한', codes: ['WB_CLCO_RATE_LIMITED'],
    guide: '잠시 기다린 뒤 직접 다시 점검하세요.' },
  { kind: 'timeout', title: '시간 초과', codes: ['WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT'],
    guide: '응답 시간이 초과됐습니다. 잠시 뒤 직접 다시 점검하세요.' },
  { kind: 'network', title: '네트워크 오류', codes: ['NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    guide: '앱 서버 연결을 확인하고 잠시 뒤 직접 다시 점검하세요.' },
  { kind: 'cancel', title: '취소됨', codes: ['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'],
    guide: '점검을 취소했습니다. 이전 점검 결과는 현재 결과가 아닙니다.' },
  { kind: 'model', title: '쓸 수 있는 모델 없음', codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'],
    guide: '현재 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.' },
]);

const AI_UNKNOWN_GROUP = Object.freeze({ kind: 'unverified', title: '확인 불가',
  guide: 'AI 연결이나 응답을 확인할 수 없습니다. 연결 완료로 보지 마세요. 학생 코드의 잘못으로 단정할 수 없으니, 계정 연결과 AI 연결 승인을 마쳤는지 확인하고, 마쳤는데도 계속되면 담당자에게 계정 연결과 앱 이용 권한 확인을 요청하세요.' });

function aiErrorGroup(code) {
  return AI_ERROR_GROUPS.find((group) => group.codes.includes(code)) || AI_UNKNOWN_GROUP;
}

function renderAiFailure(error, retryText) {
  const code = safeCode(error && error.code);
  const message = safeText(error && error.message) || '서버가 오류 내용을 보내지 않았습니다.';
  const group = aiErrorGroup(code);
  const wrap = node('div', null, 'ai-failure');
  wrap.dataset.aiError = group.kind;
  wrap.append(
    node('p', `AI 연결 점검 실패 · ${group.title}`, group.kind === 'cancel' ? 'state state-empty' : 'state state-error'),
    node('p', `${code === '코드 확인 불가' ? code : `코드 ${code}`} · ${message}`),
    node('p', group.guide),
  );
  if (retryText) wrap.append(node('p', retryText, 'muted'));
  return wrap;
}

// 입력이 올 때마다 새로 그린다. 이전 점검 결과를 저장하지 않으므로
// 다시 점검해 성공하면 이전 오류가, idle이 오면 이전 결과가 화면에서 사라진다.
function renderAiConnection(input) {
  const { status, mode, data, error, checkedAt } = input || {};
  const root = node('div', null, 'student-ai-connection-view');
  root.dataset.view = 'ai-connection';
  root.dataset.aiStatus = textOf(status) || 'unknown';
  const notices = renderModeNotices([{ mode }]);
  if (notices) root.append(notices);

  if (status === 'idle') {
    root.append(
      node('p', 'AI 연결 점검 전', 'state state-empty'),
      node('p', '연결 설정이 있다는 것만으로 이용 권한이 확인된 것은 아닙니다. AI 연결 승인 뒤 「AI 연결 점검」을 직접 누르세요.', 'muted'),
    );
    return root;
  }
  if (status === 'loading') {
    const box = node('p', 'AI 연결 점검 중', 'state state-loading');
    box.setAttribute('role', 'status');
    root.append(box, node('p', '점검을 멈추려면 「AI 연결 점검 취소」를 누르세요. 취소하면 늦게 도착한 응답은 표시하지 않습니다.', 'muted'));
    return root;
  }
  if (status === 'error') {
    root.append(renderAiFailure(error, AI_MANUAL_RETRY));
    return root;
  }
  if (status !== 'ok' || !data || typeof data !== 'object') {
    root.append(renderAiFailure({ code: 'AI_REQUEST_UNVERIFIED', message: 'AI 연결 점검 결과를 확인할 수 없습니다.' }, AI_MANUAL_RETRY));
    return root;
  }

  const audience = textOf(data.audienceAuthorization);
  const headline = audience === 'verified'
    ? '앱 권한 확인 후 점검(verified)'
    : audience === 'test' ? '시험 연결 점검(test)' : `확인 불가(${safeCode(audience)})`;
  const tone = audience === 'verified' ? 'ok' : 'empty';
  const list = node('dl', null, 'ai-connection-list');
  addRow(list, '점검 종류', headline);
  addRow(list, '전송 경로 점검(transportChecked)', data.transportChecked === true ? '확인됨(true)' : '확인 불가');
  addRow(list, '응답 모델 수(modelCount)', Number.isFinite(data.modelCount) ? `${data.modelCount}개` : '확인 불가');
  addRow(list, '점검 시각(checkedAt)', eventTimeText(checkedAt));
  if (data.help && typeof data.help === 'object') addRow(list, '도움 코드(help.code)', safeCode(data.help.code));
  root.append(node('p', headline, `state state-${tone}`), list);
  if (audience === 'test') {
    root.append(node('p', '시험 연결은 앱 서버까지의 경로와 모델 응답만 확인한 것입니다. 앱 이용 권한이 확인된 것은 아닙니다.'));
  } else if (audience === 'verified') {
    root.append(node('p', '점검 시각 기준으로 앱 권한 확인과 모델 응답을 확인했습니다. 이후 권한이 바뀌면 다시 점검해야 합니다.'));
  }
  root.append(
    node('p', '연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다. 사건 설명은 보안 기록에서 기록별 「AI 설명 요청」으로 따로 요청하고 확인합니다.', 'state state-empty'),
    node('p', AI_MANUAL_RETRY, 'muted'),
  );
  return root;
}

// ---------- 18단계: renderExplanation 완성 ----------

const EXPLANATION_STATE_LABELS = Object.freeze([
  ['access', '접속'], ['session', '세션'], ['device', '기기'],
]);

function explanationFailureBox(explanation, eventId, extra) {
  const code = safeCode(explanation.error && explanation.error.code);
  const message = safeText(explanation.error && explanation.error.message) || '서버가 오류 내용을 보내지 않았습니다.';
  const wrap = node('div', null, 'explanation-failure');
  wrap.append(
    node('p', `AI 설명 실패 · ${code === '코드 확인 불가' ? code : `코드 ${code}`} · ${message}`,
      code.includes('CANCELLED') ? 'state state-empty' : 'state state-error'),
    node('p', `대상 사건: ${eventId || '사건 정보 없음'}. 기록은 그대로입니다. AI 연결이나 응답 문제는 업무 앱 판정과 보안 기록에 영향을 주지 않습니다.`),
  );
  if (extra) wrap.append(node('p', extra));
  wrap.append(node('p', '다시 요청은 보안 기록의 「AI 설명 요청」을 직접 누르세요.', 'muted'));
  return wrap;
}

// 인용한 근거 ID를 현재 기록의 evidence에서 찾는다. 없으면 지어내지 않고 맞지 않는다고 적는다.
function renderCitedEvidence(event, evidenceIds) {
  const rows = Array.isArray(event.evidence) ? event.evidence : [];
  const ids = Array.isArray(evidenceIds) ? evidenceIds : [];
  const block = node('div', null, 'explanation-evidence');
  block.append(node('h4', '인용한 근거'));
  if (!ids.length) {
    block.append(node('p', '인용한 근거가 없습니다. 근거 없는 설명은 사실 판단에 쓰지 마세요.', 'state state-empty'));
    return { block, missing: ['(근거 인용 없음)'] };
  }
  const list = document.createElement('ul');
  const missing = [];
  for (const id of ids) {
    const ref = textOf(id) || '';
    const found = rows.find((row) => row && textOf(row.id) === ref);
    if (found) {
      list.append(node('li', `${ref} — ${safeText(found.text, 500) || '근거 글 없음'}`));
    } else {
      missing.push(ref || '(빈 ID)');
      list.append(node('li', `${ref || '(빈 ID)'} — 이 기록의 근거에 없는 ID입니다. 내용을 지어내지 않았습니다.`, 'state state-error'));
    }
  }
  block.append(list);
  return { block, missing };
}

function renderEventRules(event) {
  const rows = Array.isArray(event.rules) ? event.rules : [];
  const block = node('div', null, 'explanation-rules');
  block.append(node('h4', '적용 규칙'));
  if (!rows.length) {
    block.append(node('p', '이 기록에 적용된 규칙이 없습니다.', 'state state-empty'));
    return block;
  }
  const list = document.createElement('ul');
  for (const row of rows) {
    const rule = row || {};
    list.append(node('li', `${textOf(rule.id) || 'ID 없음'} — ${safeText(rule.text, 300) || '규칙 글 없음'}`));
  }
  block.append(list);
  return block;
}

// unknown은 확인 불가로만 적는다. 정상·안전으로 바꾸지 않는다.
function renderUnknownStates(event) {
  const state = event.state || {};
  const block = node('div', null, 'explanation-unknown');
  block.append(node('h4', '확인할 수 없는 상태'));
  const unknowns = EXPLANATION_STATE_LABELS.filter(([key]) => (textOf(state[key]) || 'unknown') === 'unknown');
  if (!unknowns.length) {
    block.append(node('p', '없음'));
    return block;
  }
  const list = document.createElement('ul');
  for (const [, label] of unknowns) list.append(node('li', `${label}: 확인 불가(unknown)`));
  block.append(list, node('p', '확인 불가는 안전하거나 정상이라는 뜻이 아닙니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 상태로 하세요.'));
  return block;
}

function renderProposals(event, proposals) {
  const rows = Array.isArray(proposals) ? proposals : [];
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  const block = node('div', null, 'explanation-proposals');
  block.append(node('h4', '제안'));
  if (!rows.length) {
    block.append(node('p', supported.length
      ? 'AI가 제안한 조치가 없습니다.'
      : '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).', 'state state-empty'));
    return block;
  }
  const list = document.createElement('ul');
  for (const row of rows) {
    const proposal = row || {};
    const item = document.createElement('li');
    item.append(
      node('strong', `${textOf(proposal.action) || '조치 이름 없음'} `),
      `· 이유: ${safeText(proposal.reason, 500) || '이유 없음'}`,
    );
    list.append(item);
  }
  block.append(list, node('p', '사람 확인이 필요하며 실행되지 않았습니다. 이 화면은 조치를 실행하지 않습니다.', 'state state-empty'));
  return block;
}

// 호출될 때마다 새 DOM을 만든다. 다른 기록을 고르거나 다시 불러오면
// 이전 설명과 data-student-explanation-event 표식이 함께 사라진다.
function renderExplanation(input) {
  const { event, explanation, checkedAt } = input || {};
  const result = explanation || {};
  const root = node('div', null, 'student-explanation-view');
  root.dataset.view = 'explanation';
  const notices = renderModeNotices([{ mode: result.mode }]);
  if (notices) root.append(notices);
  const eventId = textOf(event && event.id);

  // 실패는 event가 null이어도 먼저 보여 준다.
  if (result.status === 'error') {
    root.append(explanationFailureBox(result, eventId));
    return root;
  }
  if (result.status === 'loading') {
    const box = node('p', `AI 설명 요청 중: ${eventId || '선택한 사건'}`, 'state state-loading');
    box.setAttribute('role', 'status');
    root.append(box, node('p', '요청 중 다른 기록을 고르면 이 요청 결과는 표시하지 않습니다.', 'muted'));
    return root;
  }
  if (!event || !eventId) {
    root.append(node('p', '보안 기록에서 기록을 먼저 고르세요. 기록을 고르고 「AI 설명 요청」을 누르면 설명이 여기에 표시됩니다.', 'state state-empty'));
    return root;
  }
  if (result.status !== 'ok') {
    root.append(node('p', `AI 설명 전: ${eventId}을(를) 골랐습니다. 「AI 설명 요청」을 누르면 설명이 여기에 표시됩니다.`, 'state state-empty'));
    return root;
  }

  const data = result.data && typeof result.data === 'object' ? result.data : {};
  const summary = safeText(data.summary, 1500);
  if (!summary) {
    root.append(explanationFailureBox({ error: { code: 'ON_AI_INVALID_OUTPUT', message: 'AI 설명 요약을 확인할 수 없습니다.' } }, eventId));
    return root;
  }
  if (data.executed === true) {
    root.append(explanationFailureBox(
      { error: { code: 'ON_AI_INVALID_OUTPUT', message: 'AI가 이미 실행했다고 답한 설명입니다.' } },
      eventId,
      '이 앱은 조치를 실행하지 않습니다. 실행했다고 답한 설명은 쓸 수 없습니다. 실제 실행 여부는 연동 시스템에서 확인하세요.',
    ));
    return root;
  }

  const cited = renderCitedEvidence(event, data.evidenceIds);
  if (cited.missing.length) {
    root.append(explanationFailureBox(
      { error: { code: 'ON_AI_INVALID_OUTPUT', message: '설명이 인용한 근거가 이 기록의 근거와 맞지 않습니다.' } },
      eventId,
      `맞지 않는 근거 ID: ${cited.missing.join(', ')}. 근거가 맞지 않아 이 설명은 쓸 수 없습니다. 없는 근거를 지어내지 않았습니다.`,
    ), cited.block);
    return root;
  }

  // 여기까지 온 설명만 성공으로 본다.
  root.dataset.studentExplanationEvent = eventId;
  const head = node('dl', null, 'explanation-list');
  addRow(head, '사건 ID', eventId);
  addRow(head, '설명 시각', eventTimeText(checkedAt));
  root.append(
    node('p', 'AI 설명(참고용)', 'state state-ok'),
    head,
    node('p', summary),
    node('p', 'AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 상태로 하세요.', 'muted'),
    cited.block,
    renderEventRules(event),
    renderUnknownStates(event),
    renderProposals(event, data.proposals),
  );
  if (data.requiresHumanConfirmation === true) {
    root.append(node('p', '이 설명의 제안은 사람 확인이 필요하며 실행되지 않았습니다(requiresHumanConfirmation: true, executed: false).', 'muted'));
  }
  return root;
}

// ---------- 19단계: renderAction 보조 ----------

// 상태마다 뜻이 다른 문장을 원래 값과 함께 쓴다. ACK(pending)는 효과가 아니다.
const ACTION_STATE_INFO = Object.freeze({
  idle: { tone: 'empty', headline: '아직 미실행(idle)', note: '조치를 준비하지 않았습니다. 사람 확인과 전달이 모두 일어나지 않았습니다.' },
  loading: { tone: 'loading', headline: '조치 준비 또는 결과 조회 중(loading)', note: '완료가 아닙니다. 결과는 아직 확인되지 않았습니다.' },
  prepared: { tone: 'empty', headline: '준비됨 · 미실행(prepared)', note: '대상과 조치만 준비했습니다. 아직 서버에 전달하지 않았습니다. 제공 화면의 「대상과 조치를 확인했으며 집행합니다」를 사람이 직접 눌러야 전달됩니다.' },
  executing: { tone: 'loading', headline: '서버에 전달 중(executing)', note: '완료가 아닙니다. 서버가 받았는지도 아직 확인되지 않았습니다.' },
  pending: { tone: 'loading', headline: '서버 접수 · 처리 중(pending)', note: '서버가 요청을 받았다는 접수 응답(ACK)입니다. 접수는 효과가 아니며 완료도 아닙니다. 실제 효과는 결과를 재조회해 확인합니다.' },
  succeeded: { tone: 'ok', headline: '효과 확인(succeeded)', note: '연동 시스템이 실제 효과를 관측했습니다.' },
  denied: { tone: 'error', headline: '거절(denied)', note: '연동 시스템이 이 조치를 거절했습니다. 효과는 적용되지 않았습니다.' },
  failed: { tone: 'error', headline: '실패(failed)', note: '연동 시스템이 조치를 처리하지 못했습니다.' },
  unknown: { tone: 'empty', headline: '결과 불명(unknown)', note: '성공으로도, 효과 없음으로도 판단하지 마세요. 이미 전달된 조치의 효과가 없다고 단정하지 말고, 제공 화면의 「연동 시스템 결과만 재조회」로 결과만 다시 조회하세요.' },
  expired: { tone: 'empty', headline: '확인 기한 지남(expired)', note: '이번 준비로는 집행할 수 없습니다. 현재 기록에서 조치를 다시 준비하세요.' },
  error: { tone: 'error', headline: '요청이 처리되지 않음(error)', note: '아래 원인을 확인하세요. 조치가 전달됐는지 확실하지 않으면 결과만 재조회하세요.' },
});

function actionRow(list, term, value) {
  const text = textOf(value) || (Number.isFinite(value) ? String(value) : null);
  if (text) addRow(list, term, safeText(text, 200));
}

function renderActionIdentity(event, actionId, target, receipt, confirmationExpiresAt) {
  const list = node('dl', null, 'action-list');
  actionRow(list, '사건 ID(event.id)', event && event.id);
  const evidenceIds = event && Array.isArray(event.evidence)
    ? event.evidence.map((row) => textOf(row && row.id)).filter(Boolean) : [];
  if (evidenceIds.length) addRow(list, '근거 ID(event.evidence)', evidenceIds.join(', '));
  actionRow(list, '조치(actionId)', actionId);
  actionRow(list, '실제 대상(target.id)', target && target.id);
  actionRow(list, '대상 세대(target.generation)', target && target.generation);
  actionRow(list, '요청 ID(receipt.requestId)', receipt && receipt.requestId);
  actionRow(list, '영수증 ID(receipt.receiptId)', receipt && receipt.receiptId);
  actionRow(list, '버전(receipt.version)', receipt && receipt.version);
  actionRow(list, '사람 확인 기한(confirmationExpiresAt)', confirmationExpiresAt && eventTimeText(confirmationExpiresAt));
  return list.childElementCount ? list : null;
}

// 입력이 올 때마다 새로 그린다. 이전 대상·요청·결과를 저장하지 않으므로
// 다른 기록을 고르거나 다시 불러오면 이전 표시가 남지 않는다.
function renderAction(input) {
  const { status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = input || {};
  const root = node('div', null, 'student-action-view');
  root.dataset.view = 'action';
  const raw = textOf(status) || 'unknown';
  const effectApplied = observation && observation.effectApplied === true;
  // succeeded는 실제 효과가 관측된 경우에만 효과 확인으로 쓴다.
  const resolved = raw === 'succeeded' && !effectApplied ? 'unknown' : raw;
  const info = ACTION_STATE_INFO[resolved] || ACTION_STATE_INFO.unknown;
  root.dataset.actionStatus = resolved;

  root.append(node('p', info.headline, `state state-${info.tone}`), node('p', info.note));
  if (raw === 'succeeded' && !effectApplied) {
    root.append(node('p', `서버가 보낸 상태는 succeeded이지만 실제 효과 관측(effectApplied: true)이 없어 효과 확인으로 쓰지 않습니다. 관측값: ${textOf(observation && String(observation.effectApplied)) || '없음'}`, 'state state-error'));
  }

  const identity = renderActionIdentity(event, actionId, target, receipt, confirmationExpiresAt);
  if (identity) root.append(identity);

  if (resolved === 'succeeded') {
    const observed = node('dl', null, 'action-observation');
    addRow(observed, '관측 시각(observation.observedAt)', eventTimeText(observation && observation.observedAt));
    addRow(observed, '실제 효과', 'effectApplied: true');
    actionRow(observed, '영수증 ID(receiptId)', receipt && receipt.receiptId);
    root.append(node('h4', '연동 시스템 관측'), observed);
  }

  if (receipt && receipt.replayed === true) {
    root.append(node('p', '같은 요청이 다시 전달된 것으로 기록됐습니다(replayed: true). 새 조치가 추가로 실행된 것이 아닙니다.', 'muted'));
  }
  if (receipt && receipt.superseded === true) {
    root.append(node('p', '이전 조회는 최신 결과를 대신하지 않습니다(superseded: true). 최신 결과를 다시 조회하세요.', 'muted'));
  }
  if (error) {
    const code = safeCode(error.code);
    root.append(node('p', `${code === '코드 확인 불가' ? code : `코드 ${code}`} · ${safeText(error.message) || '서버가 오류 내용을 보내지 않았습니다.'}`, 'state state-error'));
  }
  const note = safeText(message, 300);
  if (note) root.append(node('p', note, 'muted'));

  root.append(node('p', '이 화면은 조치를 실행하지 않습니다. 준비·집행·결과 재조회·취소는 모두 제공 화면의 버튼으로 사람이 직접 진행합니다. 「조치 화면 취소」는 화면 표시만 지우며, 이미 서버에 전달된 효과를 되돌리지 않습니다.', 'muted'));

  const eventId = textOf(event && event.id);
  const requestId = textOf(receipt && receipt.requestId);
  if (eventId) root.dataset.studentActionEvent = eventId;
  if (requestId) root.dataset.studentActionRequest = requestId;
  return root;
}

export function createStudentView(context = {}) {
  return {
    renderIdentity,
    renderDecision,
    renderEvents: createEventsRenderer(),
    renderStatus: createStatusRenderer(context),
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection,
    renderExplanation,
    renderAction,
  };
}
