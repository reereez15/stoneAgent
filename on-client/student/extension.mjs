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

export function createStudentView(context = {}) {
  return {
    renderIdentity,
    renderDecision,
    renderEvents: createEventsRenderer(),
    renderStatus: createStatusRenderer(context),
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
