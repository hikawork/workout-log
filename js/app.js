/**
 * app.js
 * 메인 화면 렌더링 및 사용자 인터랙션 컨트롤러 (커스텀 SVG 아이콘 & 테마 지원)
 */

(function () {
  const Icons = window.WorkoutIcons;
  const Models = window.WorkoutModels;
  const Repo = window.WorkoutRepository;
  const Stats = window.WorkoutStats;

  const THEME_STORAGE_KEY = 'workout_app_theme_v1';

  // 앱 상태
  const state = {
    activeTab: 'log', // 'log' | 'calendar' | 'stats'
    selectedDate: Models.formatDateKey(new Date()),
    selectedExerciseId: 'running',
    editingLogId: null,
    form: {
      minutes: 30,
      seconds: 0,
      distanceKm: '',
      reps: 15,
      sets: 3,
      weightKg: '',
      note: '',
    },
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    calendarSelectedDate: Models.formatDateKey(new Date()),
    statsPeriod: 'month', // 'week' | 'month' | 'days30' | 'all'
    customIconKey: 'custom_flame',
    isManagingExercises: false,
    editingExerciseId: null,
  };

  /**
   * 초기화
   */
  function init() {
    initTheme();
    renderCustomIconPicker();
    selectExerciseForDate(state.selectedExerciseId);
    bindStaticEvents();
    Repo.onFileSyncChange(() => {
      renderFileSyncBar();
    });
    Repo.initSavedFileHandle();
    renderAll();
  }

  /**
   * 다크/라이트 테마 초기화 및 전환
   */
  function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    applyTheme(saved);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    const svgEl = document.getElementById('theme-icon-svg');
    if (!svgEl) return;
    if (theme === 'dark') {
      // 해 아이콘 (클릭 시 라이트 모드로)
      svgEl.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    } else {
      // 달 아이콘 (클릭 시 다크 모드로)
      svgEl.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
  }

  /**
   * 커스텀 운동 모달 내부 벡터 아이콘 선택기 렌더링
   */
  function renderCustomIconPicker() {
    const container = document.getElementById('custom-icon-picker');
    if (!container) return;
    const options = Icons.getCustomSelectableIcons();
    container.innerHTML = options
      .map(
        (opt) => `
        <div class="icon-pick-option ${
          state.customIconKey === opt.key ? 'selected' : ''
        }" data-pick-icon="${opt.key}">
          ${Icons.renderExerciseBadge(opt.key, opt.key, 'sm')}
          <span style="font-size: 10px; font-weight: 700; color: var(--text-secondary)">${opt.label}</span>
        </div>
      `
      )
      .join('');
  }

  /**
   * 운동 종목 추가 / 수정 모달 열기
   */
  function openExerciseModal(targetEx = null) {
    const modal = document.getElementById('custom-ex-modal');
    const titleEl = document.getElementById('custom-ex-modal-title');
    const saveBtn = document.getElementById('save-custom-ex-btn');
    const nameEl = document.getElementById('custom-ex-name');
    const iconHiddenEl = document.getElementById('custom-ex-icon');
    const selectableKeys = Icons.getCustomSelectableIcons().map((o) => o.key);

    if (targetEx) {
      state.editingExerciseId = targetEx.id;
      if (titleEl) titleEl.textContent = '운동 종목 설정 수정';
      if (saveBtn) saveBtn.textContent = '수정 저장';
      if (nameEl) nameEl.value = targetEx.name || '';

      const initialIcon = selectableKeys.includes(targetEx.icon)
        ? targetEx.icon
        : selectableKeys.includes(targetEx.id)
        ? targetEx.id
        : 'custom_flame';
      state.customIconKey = initialIcon;
      if (iconHiddenEl) iconHiddenEl.value = initialIcon;

      const radio = document.querySelector(
        `input[name="custom-ex-type"][value="${targetEx.recordType}"]`
      );
      if (radio) radio.checked = true;
    } else {
      state.editingExerciseId = null;
      if (titleEl) titleEl.textContent = '나만의 운동 종목 추가';
      if (saveBtn) saveBtn.textContent = '추가하기';
      if (nameEl) nameEl.value = '';
      state.customIconKey = 'custom_flame';
      if (iconHiddenEl) iconHiddenEl.value = 'custom_flame';

      const defaultRadio = document.querySelector('input[name="custom-ex-type"][value="sets"]');
      if (defaultRadio) defaultRadio.checked = true;
    }

    renderCustomIconPicker();
    modal?.classList.add('open');
  }

  /**
   * 기존 운동 기록을 폼에 불러오기 (수정 모드 진입)
   */
  function loadLogIntoForm(log) {
    if (!log) return;
    state.editingLogId = log.id;
    state.selectedDate = log.date;
    state.selectedExerciseId = log.exerciseId;
    state.form.minutes =
      log.minutes !== undefined && log.minutes !== null ? Number(log.minutes) : 30;
    state.form.seconds = Number(log.seconds) || 0;
    state.form.distanceKm = log.distanceKm ?? '';
    state.form.reps = log.reps || 15;
    state.form.sets = log.sets || 3;
    state.form.weightKg = log.weightKg ?? '';
    state.form.note = log.note || '';
  }

  /**
   * 운동 종목 기본값으로 폼 초기화 (신규 등록 모드)
   */
  function applyDefaultFormForExercise(exerciseId, keepEditingId = false) {
    const exercises = Repo.getAllExercises();
    const ex = exercises.find((e) => e.id === exerciseId) || exercises[0];
    if (!ex) return;

    if (!keepEditingId) {
      state.editingLogId = null;
    }
    state.selectedExerciseId = ex.id;
    if (ex.recordType === Models.RECORD_TYPES.TIME) {
      state.form.minutes = ex.defaultMinutes !== undefined ? ex.defaultMinutes : 30;
      state.form.seconds = ex.defaultSeconds || 0;
      state.form.distanceKm = '';
    } else {
      state.form.reps = ex.defaultReps || 15;
      state.form.sets = ex.defaultSets || 3;
      state.form.weightKg = '';
    }
    if (!keepEditingId) {
      state.form.note = '';
    }
  }

  /**
   * 특정 날짜에서 운동 종목 선택 시:
   * - 해당 날짜에 이미 같은 종목의 기록이 있으면 자동으로 수정 모드로 불러옴
   * - 없으면 신규 등록 기본값 적용
   */
  function selectExerciseForDate(exerciseId) {
    const allEx = Repo.getAllExercises();
    const validEx = allEx.find((e) => e.id === exerciseId) || allEx[0];
    const targetId = validEx ? validEx.id : exerciseId;

    const dayLogs = Repo.getLogsByDate(state.selectedDate);
    const existingLog = dayLogs.find((l) => l.exerciseId === targetId);

    if (existingLog) {
      loadLogIntoForm(existingLog);
    } else {
      applyDefaultFormForExercise(targetId, false);
    }
  }

  /**
   * 토스트 메시지 표시
   */
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast-msg');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  /**
   * 전체 화면 갱신
   */
  function renderAll() {
    renderFileSyncBar();
    renderHeaderStreak();
    renderDateNavigator();
    renderExerciseGrid();
    renderInputForm();
    renderDailyLogs();
    renderCalendarTab();
    renderStatsTab();
  }

  /**
   * 상단 로컬 파일 실시간 자동저장 상태 바 렌더링 (PC + 모바일 통합 지원)
   */
  function renderFileSyncBar() {
    const bar = document.getElementById('file-sync-bar');
    if (!bar) return;

    const info = Repo.getFileSyncStatus();
    bar.classList.remove('connected', 'needs-perm');

    if (info.status === 'connected') {
      bar.classList.add('connected');
      const savedText = info.lastSavedAt ? ` · ${info.lastSavedAt} 저장됨` : '';
      bar.innerHTML = `
        <div class="sync-info-group">
          <span class="sync-dot"></span>
          <span>파일 자동저장 켜짐 · <strong>${escapeHtml(info.fileName)}</strong>${savedText}</span>
        </div>
        <div class="sync-btn-group">
          <button type="button" class="sync-action-btn" data-sync-act="open-existing" title="저장된 파일 불러오기">📂 파일 열기</button>
          <button type="button" class="sync-action-btn" data-sync-act="disconnect" title="자동저장 해제">해제</button>
        </div>
      `;
      return;
    }

    if (info.status === 'needs_permission') {
      bar.classList.add('needs-perm');
      bar.innerHTML = `
        <div class="sync-info-group">
          <span class="sync-dot"></span>
          <span>이전 파일(<strong>${escapeHtml(info.fileName)}</strong>)에 자동저장을 이어갈까요?</span>
        </div>
        <div class="sync-btn-group">
          <button type="button" class="sync-action-btn primary" data-sync-act="reconnect">🔗 1클릭 재연결</button>
          <button type="button" class="sync-action-btn" data-sync-act="connect-new">새 파일</button>
        </div>
      `;
      return;
    }

    // 기본: disconnected (PC 및 모바일 모두 동일한 '+ 새 파일 연결' / '📂 기존 파일 열기' 제공)
    bar.innerHTML = `
      <div class="sync-info-group">
        <span class="sync-dot"></span>
        <span>💾 내 기기 파일에 자동저장 연결 (캐시 삭제 안심)</span>
      </div>
      <div class="sync-btn-group">
        <button type="button" class="sync-action-btn primary" data-sync-act="connect-new">+ 새 파일 연결</button>
        <button type="button" class="sync-action-btn" data-sync-act="open-existing">📂 기존 파일 열기</button>
      </div>
    `;
  }

  /**
   * 상단 연속 운동일 배지 렌더링
   */
  function renderHeaderStreak() {
    const allLogs = Repo.getAllLogs();
    const streak = Stats.calculateStreak(allLogs);
    const badge = document.getElementById('streak-badge');
    if (badge) {
      badge.innerHTML = streak > 0 ? `⚡ ${streak}일 연속 달성` : `⚡ READY TO WORKOUT`;
    }
  }

  /**
   * 상단 날짜 선택 바 렌더링
   */
  function renderDateNavigator() {
    const dateTextEl = document.getElementById('current-date-text');
    const dateInputEl = document.getElementById('date-picker-input');
    const todayBtn = document.getElementById('go-today-btn');

    const todayStr = Models.formatDateKey(new Date());
    const isToday = state.selectedDate === todayStr;

    if (dateTextEl) {
      dateTextEl.textContent =
        Models.formatKoreanDate(state.selectedDate) + (isToday ? ' · 오늘' : '');
    }
    if (dateInputEl) {
      dateInputEl.value = state.selectedDate;
    }
    if (todayBtn) {
      todayBtn.style.display = isToday ? 'none' : 'inline-block';
    }
  }

  /**
   * 운동 종류 선택 그리드 렌더링 ('종목 편집' 모드일 때만 삭제/복원 노출)
   */
  function renderExerciseGrid() {
    const container = document.getElementById('exercise-grid');
    if (!container) return;

    const toggleBtn = document.getElementById('toggle-ex-manage-btn');
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', state.isManagingExercises);
      toggleBtn.textContent = state.isManagingExercises ? '✓ 편집 완료' : '⚙️ 종목 편집';
    }
    container.classList.toggle('managing', state.isManagingExercises);

    const exercises = Repo.getAllExercises();
    const dayLogs = Repo.getLogsByDate(state.selectedDate);
    const recordedExerciseIds = new Set(dayLogs.map((l) => l.exerciseId));
    const hasDeletedDefaults = Repo.getDeletedDefaultIds().length > 0;

    const html = exercises
      .map((ex) => {
        const isSelected = ex.id === state.selectedExerciseId;
        const isRecorded = recordedExerciseIds.has(ex.id);
        const typeLabel = ex.recordType === Models.RECORD_TYPES.TIME ? 'TIME · 분' : 'SETS · 회';
        const recordedBadge =
          !state.isManagingExercises && isRecorded
            ? `<span class="recorded-dot-badge">DONE</span>`
            : '';
        const editBtn = state.isManagingExercises
          ? `<button type="button" class="edit-custom-ex-btn" data-edit-ex="${ex.id}" title="${escapeHtml(ex.name)} 종목 수정">✎</button>`
          : '';
        const deleteBtn = state.isManagingExercises
          ? `<button type="button" class="delete-custom-ex-btn" data-delete-ex="${ex.id}" title="${escapeHtml(ex.name)} 종목 삭제">✕</button>`
          : '';
        return `
          <div class="exercise-chip ${isSelected ? 'selected' : ''} ${
          isRecorded ? 'recorded' : ''
        }" draggable="true" data-ex-id="${ex.id}" title="${
          state.isManagingExercises ? '클릭하여 종목 수정 / 끌어서 순서 변경' : '끌어서 순서 변경'
        }">
            ${recordedBadge}
            ${editBtn}
            ${deleteBtn}
            ${Icons.renderExerciseBadge(ex.id, ex.icon, 'md')}
            <span class="ex-name">${escapeHtml(ex.name)}</span>
            <span class="ex-type-tag">${typeLabel}</span>
          </div>
        `;
      })
      .join('');

    const addBtnHtml = `
      <div class="exercise-chip add-exercise-chip" id="open-custom-ex-modal-btn">
        <div class="add-plus-circle">+</div>
        <span class="ex-name">종목 추가</span>
        <span class="ex-type-tag">CUSTOM</span>
      </div>
    `;

    const restoreBtnHtml =
      state.isManagingExercises && hasDeletedDefaults
        ? `
      <div class="exercise-chip add-exercise-chip" id="restore-default-ex-btn" title="삭제한 기본 운동 종목 다시 불러오기">
        <div class="add-plus-circle" style="font-size: 16px">↺</div>
        <span class="ex-name">기본 복원</span>
        <span class="ex-type-tag">RESET</span>
      </div>
    `
        : '';

    container.innerHTML = html + addBtnHtml + restoreBtnHtml;
  }

  /**
   * 선택된 운동 종목에 맞는 입력 폼 렌더링 (시간 중심 vs 횟수x세트 중심)
   */
  function renderInputForm() {
    const container = document.getElementById('dynamic-input-section');
    if (!container) return;

    const exercises = Repo.getAllExercises();
    const ex = exercises.find((e) => e.id === state.selectedExerciseId) || exercises[0];
    if (!ex) return;

    const isTimeMode = ex.recordType === Models.RECORD_TYPES.TIME;
    const isEditing = Boolean(state.editingLogId);

    let fieldsHtml = '';

    if (isTimeMode) {
      const durationPreviewText = Models.formatDuration(state.form.minutes, state.form.seconds);
      fieldsHtml = `
        <div class="dual-grid">
          <div class="field-group">
            <div class="field-label"><span>운동 시간 (분)</span></div>
            <div class="stepper-row">
              <button type="button" class="stepper-btn" data-step-field="minutes" data-step-delta="-1">-</button>
              <div class="number-input-wrap">
                <input type="number" id="input-minutes" class="number-input" min="0" max="600" value="${state.form.minutes}" />
                <span class="unit-suffix">분</span>
              </div>
              <button type="button" class="stepper-btn" data-step-field="minutes" data-step-delta="1">+</button>
            </div>
            <div class="preset-chips">
              ${[0, 1, 5, 15, 30, 60]
                .map(
                  (m) =>
                    `<button type="button" class="preset-btn" data-preset-field="minutes" data-preset-val="${m}">${m}분</button>`
                )
                .join('')}
            </div>
          </div>

          <div class="field-group">
            <div class="field-label"><span>운동 시간 (초)</span></div>
            <div class="stepper-row">
              <button type="button" class="stepper-btn" data-step-field="seconds" data-step-delta="-10">-10</button>
              <div class="number-input-wrap">
                <input type="number" id="input-seconds" class="number-input" min="0" max="59" value="${state.form.seconds}" />
                <span class="unit-suffix">초</span>
              </div>
              <button type="button" class="stepper-btn" data-step-field="seconds" data-step-delta="10">+10</button>
            </div>
            <div class="preset-chips">
              ${[0, 15, 30, 45, 50]
                .map(
                  (s) =>
                    `<button type="button" class="preset-btn" data-preset-field="seconds" data-preset-val="${s}">${s}초</button>`
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="volume-preview" id="time-duration-preview">
          <span>TOTAL TIME · 총 운동 시간 = <strong>${durationPreviewText}</strong></span>
        </div>

        ${
          ex.hasDistance
            ? `
          <div class="field-group">
            <div class="field-label">
              <span>이동 거리 (선택사항)</span>
            </div>
            <div class="number-input-wrap">
              <input type="number" id="input-distance" class="number-input" step="0.1" min="0" placeholder="0.0" value="${state.form.distanceKm}" />
              <span class="unit-suffix">KM</span>
            </div>
          </div>
        `
            : ''
        }
      `;
    } else {
      const totalReps = (Number(state.form.reps) || 0) * (Number(state.form.sets) || 0);
      fieldsHtml = `
        <div class="dual-grid">
          <div class="field-group">
            <div class="field-label"><span>1세트당 횟수</span></div>
            <div class="stepper-row">
              <button type="button" class="stepper-btn" data-step-field="reps" data-step-delta="-1">-</button>
              <div class="number-input-wrap">
                <input type="number" id="input-reps" class="number-input" min="1" max="500" value="${state.form.reps}" />
                <span class="unit-suffix">회</span>
              </div>
              <button type="button" class="stepper-btn" data-step-field="reps" data-step-delta="1">+</button>
            </div>
            <div class="preset-chips">
              ${[8, 10, 12, 15, 20, 30]
                .map(
                  (r) =>
                    `<button type="button" class="preset-btn" data-preset-field="reps" data-preset-val="${r}">${r}회</button>`
                )
                .join('')}
            </div>
          </div>

          <div class="field-group">
            <div class="field-label"><span>세트 수</span></div>
            <div class="stepper-row">
              <button type="button" class="stepper-btn" data-step-field="sets" data-step-delta="-1">-</button>
              <div class="number-input-wrap">
                <input type="number" id="input-sets" class="number-input" min="1" max="50" value="${state.form.sets}" />
                <span class="unit-suffix">SET</span>
              </div>
              <button type="button" class="stepper-btn" data-step-field="sets" data-step-delta="1">+</button>
            </div>
            <div class="preset-chips">
              ${[1, 3, 4, 5, 6]
                .map(
                  (s) =>
                    `<button type="button" class="preset-btn" data-preset-field="sets" data-preset-val="${s}">${s}세트</button>`
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="volume-preview" id="sets-volume-preview">
          <span>TOTAL VOLUME · ${state.form.reps}회 × ${state.form.sets}세트 = <strong>${totalReps}회</strong></span>
        </div>

        ${
          ex.hasWeight
            ? `
          <div class="field-group">
            <div class="field-label">
              <span>중량 추가 (선택사항 · 맨몸이면 비워두세요)</span>
            </div>
            <div class="number-input-wrap">
              <input type="number" id="input-weight" class="number-input" step="0.5" min="0" placeholder="0" value="${state.form.weightKg}" />
              <span class="unit-suffix">KG</span>
            </div>
          </div>
        `
            : ''
        }
      `;
    }

    container.innerHTML = `
      <div class="selected-exercise-banner ${isEditing ? 'editing-mode' : ''}">
        <div class="selected-ex-title">
          ${Icons.renderExerciseBadge(ex.id, ex.icon, 'sm')}
          <span>${escapeHtml(ex.name)} ${
      isEditing ? '· 기록 수정 모드' : '· 신규 기록'
    }</span>
        </div>
        <span class="record-mode-badge ${isTimeMode ? 'time' : 'sets'}">
          ${isTimeMode ? 'TIME MODE' : 'SETS × REPS'}
        </span>
      </div>

      ${fieldsHtml}

      <div class="field-group">
        <div class="field-label"><span>운동 메모 (선택)</span></div>
        <input type="text" id="input-note" class="text-input" maxlength="80" placeholder="오늘의 루틴이나 컨디션을 남겨보세요" value="${escapeHtml(state.form.note)}" />
      </div>

      <div class="submit-btn-row">
        ${
          isEditing
            ? `
            <button type="button" class="primary-btn" id="save-workout-btn">
              <span>기록 수정 저장</span>
            </button>
            <button type="button" class="secondary-btn" id="add-as-new-workout-btn" title="기존 기록을 유지하고 별도 세트로 하나 더 추가합니다">
              + 새로 추가
            </button>
          `
            : `
            <button type="button" class="primary-btn" id="save-workout-btn">
              <span>+ 오늘 운동 등록하기</span>
            </button>
          `
        }
      </div>
    `;
  }

  /**
   * 선택한 날짜의 운동 기록 목록 렌더링
   */
  function renderDailyLogs() {
    const listEl = document.getElementById('daily-log-list');
    const summaryEl = document.getElementById('daily-summary-strip');
    const countBadge = document.getElementById('daily-count-badge');
    if (!listEl || !summaryEl) return;

    const logs = Repo.getLogsByDate(state.selectedDate);
    if (countBadge) {
      countBadge.textContent = `${logs.length}건`;
    }

    let dayTotalSeconds = 0;
    let daySets = 0;
    let dayReps = 0;
    logs.forEach((l) => {
      if (l.recordType === Models.RECORD_TYPES.TIME) {
        dayTotalSeconds += Math.round((Number(l.minutes) || 0) * 60 + (Number(l.seconds) || 0));
      } else {
        daySets += Number(l.sets) || 0;
        dayReps += (Number(l.reps) || 0) * (Number(l.sets) || 0);
      }
    });

    const dayTimeText =
      dayTotalSeconds > 0
        ? Models.formatDuration(Math.floor(dayTotalSeconds / 60), dayTotalSeconds % 60)
        : '0분';

    summaryEl.innerHTML = `
      <div class="summary-pill">
        <div class="s-label">완료 종목</div>
        <div class="s-val">${logs.length}개</div>
      </div>
      <div class="summary-pill">
        <div class="s-label">유산소 시간</div>
        <div class="s-val">${dayTimeText}</div>
      </div>
      <div class="summary-pill">
        <div class="s-label">근력 볼륨</div>
        <div class="s-val">${daySets}셋 (${dayReps}회)</div>
      </div>
    `;

    if (logs.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div style="margin-bottom: 10px">${Icons.renderExerciseBadge('custom_bolt', 'custom_bolt', 'md')}</div>
          <div>이 날짜에 등록된 운동 기록이 없습니다.<br/>위에서 운동 종목을 눌러 간편하게 등록해 보세요!</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = logs
      .map((log) => {
        const isEditing = state.editingLogId === log.id;
        return `
          <div class="log-item ${isEditing ? 'editing' : ''}" draggable="true" data-row-edit-id="${log.id}">
            <div class="log-left">
              <span class="drag-handle" title="끌어서 순서 변경">⋮⋮</span>
              ${Icons.renderExerciseBadge(log.exerciseId, log.exerciseIcon, 'md')}
              <div class="log-info">
                <div class="log-title-row">
                  <span class="log-ex-name">${escapeHtml(log.exerciseName)}</span>
                  ${
                    isEditing
                      ? `<span style="font-size:10px;font-weight:800;color:var(--accent-orange);background:var(--accent-orange-soft);padding:2px 7px;border-radius:99px;">EDITING</span>`
                      : ''
                  }
                </div>
                <div class="log-metric">${Models.formatLogSummary(log)}</div>
                ${log.note ? `<div class="log-note">${escapeHtml(log.note)}</div>` : ''}
              </div>
            </div>
            <div class="log-actions">
              <button type="button" class="icon-btn" data-edit-id="${log.id}" title="이 기록 수정">수정</button>
              <button type="button" class="icon-btn delete" data-delete-id="${log.id}" title="삭제">삭제</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * 캘린더 탭(월간 일별 기록 조회) 렌더링
   */
  function renderCalendarTab() {
    const titleEl = document.getElementById('cal-month-title');
    const gridEl = document.getElementById('calendar-grid');
    const detailTitleEl = document.getElementById('cal-selected-date-title');
    const detailListEl = document.getElementById('cal-selected-log-list');
    if (!titleEl || !gridEl) return;

    const year = state.calendarYear;
    const month = state.calendarMonth;
    titleEl.textContent = `${year}년 ${month + 1}월`;

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthStart = Models.formatDateKey(new Date(year, month, 1));
    const monthEnd = Models.formatDateKey(new Date(year, month, daysInMonth));
    const monthLogs = Repo.getLogsByDateRange(monthStart, monthEnd);

    const logsByDate = {};
    monthLogs.forEach((l) => {
      if (!logsByDate[l.date]) logsByDate[l.date] = [];
      logsByDate[l.date].push(l);
    });

    const todayStr = Models.formatDateKey(new Date());
    let cellsHtml = '';

    for (let i = 0; i < firstDayOfWeek; i++) {
      cellsHtml += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = Models.formatDateKey(new Date(year, month, d));
      const dayLogs = logsByDate[dateStr] || [];
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === state.calendarSelectedDate;
      const hasLogs = dayLogs.length > 0;

      const miniBadges = dayLogs
        .slice(0, 3)
        .map((l) => Icons.renderCalendarMiniDot(l.exerciseId, l.exerciseIcon))
        .join('');

      cellsHtml += `
        <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${
        hasLogs ? 'has-logs' : ''
      }" data-cal-date="${dateStr}">
          <span class="cal-day-num">${d}</span>
          <div class="cal-day-icons">${miniBadges}</div>
          <span class="cal-day-count">${hasLogs ? `${dayLogs.length}건` : ''}</span>
        </div>
      `;
    }

    gridEl.innerHTML = cellsHtml;

    if (detailTitleEl && detailListEl) {
      detailTitleEl.textContent = Models.formatKoreanDate(state.calendarSelectedDate);
      const selectedLogs = Repo.getLogsByDate(state.calendarSelectedDate);

      if (selectedLogs.length === 0) {
        detailListEl.innerHTML = `
          <div class="empty-state">
            <div>이 날에는 등록된 운동 기록이 없습니다.</div>
          </div>
        `;
      } else {
        detailListEl.innerHTML = selectedLogs
          .map(
            (log) => `
          <div class="log-item" draggable="true" data-cal-edit-id="${log.id}">
            <div class="log-left">
              <span class="drag-handle" title="끌어서 순서 변경">⋮⋮</span>
              ${Icons.renderExerciseBadge(log.exerciseId, log.exerciseIcon, 'md')}
              <div class="log-info">
                <div class="log-ex-name">${escapeHtml(log.exerciseName)}</div>
                <div class="log-metric">${Models.formatLogSummary(log)}</div>
                ${log.note ? `<div class="log-note">${escapeHtml(log.note)}</div>` : ''}
              </div>
            </div>
            <div class="log-actions">
              <button type="button" class="icon-btn" data-cal-edit-id="${log.id}">수정</button>
              <button type="button" class="icon-btn delete" data-cal-delete-id="${log.id}">삭제</button>
            </div>
          </div>
        `
          )
          .join('');
      }
    }
  }

  /**
   * 통계 탭 렌더링
   */
  function renderStatsTab() {
    const allLogs = Repo.getAllLogs();
    const range = Stats.getDateRangeForPeriod(state.statsPeriod);
    const filteredLogs = Repo.getLogsByDateRange(range.startDate, range.endDate);
    const summary = Stats.computeSummary(filteredLogs, allLogs);

    document.querySelectorAll('.period-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.period === state.statsPeriod);
    });

    const kpiContainer = document.getElementById('stats-kpi-grid');
    if (kpiContainer) {
      const hoursText =
        summary.totalSeconds > 0
          ? Models.formatDuration(summary.totalMinutes, summary.remainSeconds)
          : '0분';

      kpiContainer.innerHTML = `
        <div class="kpi-card">
          <span class="kpi-label">ACTIVE DAYS · 출석일</span>
          <span class="kpi-value">${summary.activeDaysCount}일</span>
          <span class="kpi-sub">총 ${summary.totalLogsCount}건의 운동 완료</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">CARDIO TIME · 총 시간</span>
          <span class="kpi-value">${hoursText}</span>
          <span class="kpi-sub">누적 거리 ${summary.totalDistanceKm}km</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">TOTAL SETS · 총 세트</span>
          <span class="kpi-value">${summary.totalSets}세트</span>
          <span class="kpi-sub">근력/맨몸 루틴 합산</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">TOTAL REPS · 총 횟수</span>
          <span class="kpi-value">${summary.totalReps.toLocaleString()}회</span>
          <span class="kpi-sub">횟수 × 세트 누적 볼륨</span>
        </div>
      `;
    }

    const trendContainer = document.getElementById('stats-trend-chart');
    const trendTitleEl = document.getElementById('stats-trend-title');
    if (trendContainer) {
      const { chartTitle, buckets } = Stats.getPeriodTrend(allLogs, state.statsPeriod);
      if (trendTitleEl) {
        trendTitleEl.textContent = chartTitle;
      }
      trendContainer.innerHTML = buckets
        .map((b) => {
          const timePart =
            b.totalSeconds > 0
              ? b.minutes > 0
                ? `${b.minutes}분`
                : `${b.seconds}초`
              : '';
          const valLabel =
            b.count === 0
              ? '-'
              : timePart && b.sets > 0
              ? `${timePart}/${b.sets}셋`
              : timePart
              ? timePart
              : `${b.sets}세트`;
          return `
            <div class="trend-col">
              <span class="trend-val">${valLabel}</span>
              <div class="trend-bar-wrap">
                <div class="trend-bar ${b.count > 0 ? 'active' : ''}" style="height: ${b.heightPercent}%"></div>
              </div>
              <span class="trend-day ${b.isCurrent ? 'today' : ''}">${b.label}</span>
              <span style="font-size: 10px; color: var(--text-muted); line-height: 1">${b.subLabel || ''}</span>
            </div>
          `;
        })
        .join('');
    }

    const breakdownContainer = document.getElementById('stats-exercise-breakdown');
    if (breakdownContainer) {
      if (summary.exerciseBreakdown.length === 0) {
        breakdownContainer.innerHTML = `
          <div class="empty-state">
            <div>선택한 기간(${range.label})에 기록된 운동이 없습니다.<br/>하단의 [샘플 기록 채우기] 버튼으로 통계를 미리 확인해 보세요!</div>
          </div>
        `;
      } else {
        breakdownContainer.innerHTML = summary.exerciseBreakdown
          .map((item) => {
            let detailText = '';
            if (item.recordType === Models.RECORD_TYPES.TIME) {
              detailText = `누적 시간 ${Models.formatDuration(item.totalMinutes, item.remainSeconds)}`;
              if (item.totalDistanceKm > 0) {
                detailText += ` · 누적 거리 ${Math.round(item.totalDistanceKm * 10) / 10}km`;
              }
            } else {
              detailText = `누적 ${item.totalSets}세트 · 총 ${item.totalReps.toLocaleString()}회`;
              if (item.maxWeightKg > 0) {
                detailText += ` · 최고 중량 ${item.maxWeightKg}kg`;
              }
            }

            return `
              <div class="stat-ex-item">
                <div class="stat-ex-top">
                  <span class="stat-ex-name">
                    ${Icons.renderExerciseBadge(item.exerciseId, item.exerciseIcon, 'sm')}
                    <span>${escapeHtml(item.exerciseName)}</span>
                  </span>
                  <span class="stat-ex-count">${item.count}회 (${item.percentage}%)</span>
                </div>
                <div class="stat-ex-detail">${detailText}</div>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" style="width: ${item.barWidth}%"></div>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }
  }

  /**
   * 폼에서 현재 입력된 값 동기화
   */
  function syncFormFromDOM() {
    const minEl = document.getElementById('input-minutes');
    const secEl = document.getElementById('input-seconds');
    const distEl = document.getElementById('input-distance');
    const repsEl = document.getElementById('input-reps');
    const setsEl = document.getElementById('input-sets');
    const weightEl = document.getElementById('input-weight');
    const noteEl = document.getElementById('input-note');

    if (minEl) state.form.minutes = Math.max(0, Math.floor(Number(minEl.value) || 0));
    if (secEl) state.form.seconds = Math.max(0, Math.floor(Number(secEl.value) || 0));
    if (distEl) state.form.distanceKm = distEl.value;
    if (repsEl) state.form.reps = Math.max(1, Number(repsEl.value) || 1);
    if (setsEl) state.form.sets = Math.max(1, Number(setsEl.value) || 1);
    if (weightEl) state.form.weightKg = weightEl.value;
    if (noteEl) state.form.note = noteEl.value;
  }

  /**
   * 운동 기록 저장 (수정 모드일 때는 알림창 후 일별 달력으로 이동)
   */
  function handleSaveWorkout(forceAddNew = false) {
    syncFormFromDOM();
    const exercises = Repo.getAllExercises();
    const ex = exercises.find((e) => e.id === state.selectedExerciseId);
    if (!ex) return;

    if (
      ex.recordType === Models.RECORD_TYPES.TIME &&
      (Number(state.form.minutes) || 0) <= 0 &&
      (Number(state.form.seconds) || 0) <= 0
    ) {
      alert('운동 시간(분 또는 초)을 1초 이상 입력해 주세요.');
      return;
    }

    const payload = {
      date: state.selectedDate,
      exerciseId: ex.id,
      exerciseName: ex.name,
      exerciseIcon: ex.icon,
      recordType: ex.recordType,
      minutes: state.form.minutes,
      seconds: state.form.seconds,
      distanceKm: state.form.distanceKm,
      reps: state.form.reps,
      sets: state.form.sets,
      weightKg: state.form.weightKg,
      note: state.form.note,
    };

    if (state.editingLogId && !forceAddNew) {
      const updated = Repo.updateLog(state.editingLogId, payload);
      if (updated) {
        loadLogIntoForm(updated);
      }
      alert(`${ex.name} 기록이 수정되었습니다.`);

      const [y, m] = state.selectedDate.split('-').map(Number);
      state.calendarYear = y;
      state.calendarMonth = m - 1;
      state.calendarSelectedDate = state.selectedDate;

      switchTab('calendar');
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const created = Repo.addLog(payload);
      loadLogIntoForm(created);
      renderAll();
      showToast(`${ex.name} 기록이 등록되었습니다!`);
    }
  }

  /**
   * 날짜 변경 헬퍼
   */
  function shiftSelectedDate(deltaDays) {
    const [y, m, d] = state.selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + deltaDays);
    state.selectedDate = Models.formatDateKey(dateObj);
    selectExerciseForDate(state.selectedExerciseId);
    renderAll();
  }

  /**
   * 탭 전환 헬퍼
   */
  function switchTab(targetTab) {
    state.activeTab = targetTab;
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === targetTab);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${targetTab}`);
    });
  }

  /**
   * 드래그 앤 드롭으로 항목 위치 변경 헬퍼 (마우스 드래그 & 모바일 터치 드래그 모두 지원)
   */
  function bindSortableContainer(containerId, itemSelector, idAttr, onReorder) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let draggedEl = null;

    function finalizeOrder(sourceEl, targetEl) {
      if (!sourceEl || !targetEl || sourceEl === targetEl) return;
      const items = Array.from(container.querySelectorAll(itemSelector));
      const fromIdx = items.indexOf(sourceEl);
      const toIdx = items.indexOf(targetEl);
      if (fromIdx === -1 || toIdx === -1) return;

      if (fromIdx < toIdx) {
        targetEl.after(sourceEl);
      } else {
        targetEl.before(sourceEl);
      }

      const updatedIds = Array.from(container.querySelectorAll(itemSelector))
        .map((el) => el.getAttribute(idAttr))
        .filter(Boolean);
      onReorder(updatedIds);
    }

    // 데스크톱 HTML5 Drag & Drop
    container.addEventListener('dragstart', (e) => {
      const item = e.target.closest(itemSelector);
      if (!item) return;
      draggedEl = item;
      item.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.getAttribute(idAttr) || '');
      }
    });

    container.addEventListener('dragover', (e) => {
      if (!draggedEl) return;
      e.preventDefault();
      const overItem = e.target.closest(itemSelector);
      container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
      if (overItem && overItem !== draggedEl) {
        overItem.classList.add('drag-over');
      }
    });

    container.addEventListener('drop', (e) => {
      if (!draggedEl) return;
      e.preventDefault();
      const targetItem = e.target.closest(itemSelector);
      container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
      if (targetItem && targetItem !== draggedEl) {
        finalizeOrder(draggedEl, targetItem);
      }
    });

    container.addEventListener('dragend', () => {
      if (draggedEl) {
        draggedEl.classList.remove('dragging');
        draggedEl = null;
      }
      container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });

    // 모바일 터치 드래그 지원 (드래그 핸들 또는 길게 누르기)
    let touchTarget = null;
    container.addEventListener(
      'touchstart',
      (e) => {
        const handle = e.target.closest('.drag-handle');
        if (!handle) return;
        const item = handle.closest(itemSelector);
        if (!item) return;
        touchTarget = item;
        item.classList.add('dragging');
      },
      { passive: true }
    );

    container.addEventListener(
      'touchmove',
      (e) => {
        if (!touchTarget) return;
        const touch = e.touches[0];
        if (!touch) return;
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const overItem = elemBelow ? elemBelow.closest(itemSelector) : null;
        container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
        if (overItem && overItem !== touchTarget && container.contains(overItem)) {
          overItem.classList.add('drag-over');
        }
      },
      { passive: true }
    );

    container.addEventListener('touchend', (e) => {
      if (!touchTarget) return;
      const touch = e.changedTouches[0];
      if (touch) {
        const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const overItem = elemBelow ? elemBelow.closest(itemSelector) : null;
        if (overItem && overItem !== touchTarget && container.contains(overItem)) {
          finalizeOrder(touchTarget, overItem);
        }
      }
      touchTarget.classList.remove('dragging');
      touchTarget = null;
      container.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    });
  }

  /**
   * 이벤트 바인딩
   */
  function bindStaticEvents() {
    // 0. 상단 로컬 파일 실시간 자동저장 바 이벤트
    document.getElementById('file-sync-bar')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-sync-act]');
      if (!btn) return;
      const act = btn.dataset.syncAct;

      try {
        if (act === 'connect-new') {
          const fileName = await Repo.connectNewSyncFile();
          showToast(`'${fileName}' 파일에 실시간 자동저장이 연결되었습니다!`);
          renderAll();
        } else if (act === 'open-existing') {
          const res = await Repo.openExistingSyncFile();
          if (res) {
            selectExerciseForDate(state.selectedExerciseId);
            showToast(`'${res.fileName}' 파일(${res.count}건)을 불러오고 자동저장을 연결했습니다!`);
            renderAll();
          }
        } else if (act === 'reconnect') {
          const ok = await Repo.reconnectRememberedFile();
          if (ok) {
            selectExerciseForDate(state.selectedExerciseId);
            showToast('파일 실시간 자동저장이 다시 활성화되었습니다!');
            renderAll();
          }
        } else if (act === 'disconnect') {
          await Repo.disconnectSyncFile();
          showToast('파일 자동저장 연결이 해제되었습니다.');
          renderFileSyncBar();
        } else if (act === 'manual-export') {
          document.getElementById('export-json-btn')?.click();
        } else if (act === 'manual-import') {
          document.getElementById('import-json-input')?.click();
        }
      } catch (err) {
        if (err && err.name !== 'AbortError') {
          alert(err.message || '파일 연결 중 오류가 발생했습니다.');
        }
      }
    });

    // 1. 운동 종목 카드 드래그 앤 드롭 순서 변경
    bindSortableContainer('exercise-grid', '.exercise-chip[data-ex-id]', 'data-ex-id', (orderedIds) => {
      Repo.saveExerciseOrder(orderedIds);
      renderExerciseGrid();
      showToast('운동 종목 순서가 변경되었습니다.');
    });

    // 2. 오늘의 완료 운동 목록 드래그 앤 드롭 순서 변경
    bindSortableContainer('daily-log-list', '.log-item[data-row-edit-id]', 'data-row-edit-id', (orderedIds) => {
      Repo.reorderLogsForDate(state.selectedDate, orderedIds);
      renderDailyLogs();
      renderCalendarTab();
      showToast('운동 기록 순서가 변경되었습니다.');
    });

    // 3. 일별 달력 상세 운동 목록 드래그 앤 드롭 순서 변경
    bindSortableContainer('cal-selected-log-list', '.log-item[data-cal-edit-id]', 'data-cal-edit-id', (orderedIds) => {
      Repo.reorderLogsForDate(state.calendarSelectedDate, orderedIds);
      renderCalendarTab();
      renderDailyLogs();
      showToast('운동 기록 순서가 변경되었습니다.');
    });
    // 다크/라이트 테마 전환 버튼
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(next === 'dark' ? '네온 다크 테마가 적용되었습니다.' : '라이트 테마가 적용되었습니다.');
    });

    // 하단 탭 전환
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
        renderAll();
      });
    });

    // 날짜 이동 버튼
    document.getElementById('prev-day-btn')?.addEventListener('click', () => shiftSelectedDate(-1));
    document.getElementById('next-day-btn')?.addEventListener('click', () => shiftSelectedDate(1));
    document.getElementById('go-today-btn')?.addEventListener('click', () => {
      state.selectedDate = Models.formatDateKey(new Date());
      selectExerciseForDate(state.selectedExerciseId);
      renderAll();
    });
    document.getElementById('date-picker-input')?.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedDate = e.target.value;
        selectExerciseForDate(state.selectedExerciseId);
        renderAll();
      }
    });

    // 종목 편집 모드 토글 버튼 ('⚙️ 종목 편집' <-> '✓ 편집 완료')
    document.getElementById('toggle-ex-manage-btn')?.addEventListener('click', () => {
      state.isManagingExercises = !state.isManagingExercises;
      renderExerciseGrid();
      if (state.isManagingExercises) {
        showToast('종목 편집 모드: 카드를 눌러 설정을 수정하거나 ✕로 삭제할 수 있습니다.');
      }
    });

    // 운동 종목 선택 & 종목 수정/삭제(기본/커스텀 모두 지원) 및 복원 이벤트 위임
    document.getElementById('exercise-grid')?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-ex]');
      if (editBtn) {
        e.stopPropagation();
        const exId = editBtn.dataset.editEx;
        const targetEx = Repo.getAllExercises().find((item) => item.id === exId);
        if (targetEx) {
          openExerciseModal(targetEx);
        }
        return;
      }

      const deleteBtn = e.target.closest('[data-delete-ex]');
      if (deleteBtn) {
        e.stopPropagation();
        const allEx = Repo.getAllExercises();
        if (allEx.length <= 1) {
          alert('최소 1개의 운동 종목은 남겨두어야 합니다.\n새 종목을 먼저 추가한 뒤 삭제해 주세요.');
          return;
        }
        const exId = deleteBtn.dataset.deleteEx;
        const targetEx = allEx.find((item) => item.id === exId);
        const exName = targetEx ? targetEx.name : '선택한 운동';
        if (!confirm(`'${exName}' 종목을 목록에서 삭제하시겠습니까?`)) {
          return;
        }

        Repo.deleteExercise(exId);
        const remaining = Repo.getAllExercises();
        if (state.selectedExerciseId === exId && remaining.length > 0) {
          selectExerciseForDate(remaining[0].id);
        }
        showToast(`'${exName}' 종목이 삭제되었습니다.`);
        renderAll();
        return;
      }

      const restoreBtn = e.target.closest('#restore-default-ex-btn');
      if (restoreBtn) {
        Repo.restoreDefaultExercises();
        showToast('삭제/수정했던 기본 운동 종목이 모두 초기 상태로 복원되었습니다.');
        renderAll();
        return;
      }

      const openModalBtn = e.target.closest('#open-custom-ex-modal-btn');
      if (openModalBtn) {
        openExerciseModal(null);
        return;
      }

      const chip = e.target.closest('[data-ex-id]');
      if (chip) {
        if (state.isManagingExercises) {
          const targetEx = Repo.getAllExercises().find((item) => item.id === chip.dataset.exId);
          if (targetEx) {
            openExerciseModal(targetEx);
          }
          return;
        }
        syncFormFromDOM();
        selectExerciseForDate(chip.dataset.exId);
        renderExerciseGrid();
        renderInputForm();
        renderDailyLogs();
      }
    });

    // 동적 입력 폼 내부 이벤트 위임
    const inputSection = document.getElementById('dynamic-input-section');
    inputSection?.addEventListener('click', (e) => {
      const stepBtn = e.target.closest('[data-step-field]');
      if (stepBtn) {
        syncFormFromDOM();
        const field = stepBtn.dataset.stepField;
        const delta = Number(stepBtn.dataset.stepDelta) || 0;
        if (field === 'minutes') {
          state.form.minutes = Math.max(0, (Number(state.form.minutes) || 0) + delta);
        } else if (field === 'seconds') {
          let totalSec =
            Math.max(0, Number(state.form.minutes) || 0) * 60 +
            Math.max(0, Number(state.form.seconds) || 0) +
            delta;
          totalSec = Math.max(0, totalSec);
          state.form.minutes = Math.floor(totalSec / 60);
          state.form.seconds = totalSec % 60;
        } else {
          state.form[field] = Math.max(1, (Number(state.form[field]) || 1) + delta);
        }
        renderInputForm();
        return;
      }

      const presetBtn = e.target.closest('[data-preset-field]');
      if (presetBtn) {
        syncFormFromDOM();
        const field = presetBtn.dataset.presetField;
        const val = Number(presetBtn.dataset.presetVal);
        state.form[field] = Number.isNaN(val) ? 0 : val;
        renderInputForm();
        return;
      }

      if (e.target.closest('#save-workout-btn')) {
        handleSaveWorkout(false);
        return;
      }

      if (e.target.closest('#add-as-new-workout-btn')) {
        handleSaveWorkout(true);
        return;
      }
    });

    inputSection?.addEventListener('input', (e) => {
      if (e.target.id === 'input-reps' || e.target.id === 'input-sets') {
        syncFormFromDOM();
        const preview = document.getElementById('sets-volume-preview');
        if (preview) {
          const total = (Number(state.form.reps) || 0) * (Number(state.form.sets) || 0);
          preview.innerHTML = `<span>TOTAL VOLUME · ${state.form.reps}회 × ${state.form.sets}세트 = <strong>${total}회</strong></span>`;
        }
      } else if (e.target.id === 'input-minutes' || e.target.id === 'input-seconds') {
        syncFormFromDOM();
        const preview = document.getElementById('time-duration-preview');
        if (preview) {
          const durationText = Models.formatDuration(state.form.minutes, state.form.seconds);
          preview.innerHTML = `<span>TOTAL TIME · 총 운동 시간 = <strong>${durationText}</strong></span>`;
        }
      }
    });

    // 일별 기록 목록에서 수정 / 삭제 또는 행 클릭
    document.getElementById('daily-log-list')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-delete-id]');
      if (delBtn) {
        e.stopPropagation();
        const logId = delBtn.dataset.deleteId;
        const targetLog = Repo.getAllLogs().find((l) => l.id === logId);
        const label = targetLog ? `'${targetLog.exerciseName}' 운동 기록을` : '이 운동 기록을';
        if (!confirm(`${label} 정말 삭제하시겠습니까?`)) {
          return;
        }
        Repo.deleteLog(logId);
        if (state.editingLogId === logId) {
          selectExerciseForDate(state.selectedExerciseId);
        }
        showToast('기록이 삭제되었습니다.');
        renderAll();
        return;
      }

      const editTrigger = e.target.closest('[data-edit-id]') || e.target.closest('[data-row-edit-id]');
      if (editTrigger) {
        const logId = editTrigger.dataset.editId || editTrigger.dataset.rowEditId;
        const target = Repo.getAllLogs().find((l) => l.id === logId);
        if (!target) return;

        loadLogIntoForm(target);
        renderAll();
        showToast(`${target.exerciseName} 기록을 수정합니다.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // 캘린더 월 이동 및 날짜 클릭
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      state.calendarMonth -= 1;
      if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear -= 1;
      }
      renderCalendarTab();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      state.calendarMonth += 1;
      if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear += 1;
      }
      renderCalendarTab();
    });

    document.getElementById('calendar-grid')?.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-cal-date]');
      if (cell) {
        state.calendarSelectedDate = cell.dataset.calDate;
        renderCalendarTab();
      }
    });

    // 캘린더 하단 상세 리스트에서 수정 / 삭제 클릭
    document.getElementById('cal-selected-log-list')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('[data-cal-delete-id]');
      if (delBtn) {
        e.stopPropagation();
        const logId = delBtn.dataset.calDeleteId;
        const targetLog = Repo.getAllLogs().find((l) => l.id === logId);
        const label = targetLog ? `'${targetLog.exerciseName}' 운동 기록을` : '이 운동 기록을';
        if (!confirm(`${label} 정말 삭제하시겠습니까?`)) {
          return;
        }
        Repo.deleteLog(logId);
        if (state.editingLogId === logId) {
          state.editingLogId = null;
        }
        showToast('기록이 삭제되었습니다.');
        renderAll();
        return;
      }

      const editEl = e.target.closest('[data-cal-edit-id]');
      if (editEl) {
        const logId = editEl.dataset.calEditId;
        const target = Repo.getAllLogs().find((l) => l.id === logId);
        if (!target) return;

        loadLogIntoForm(target);
        switchTab('log');
        renderAll();
        showToast(`${target.exerciseName} 기록을 수정합니다.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    document.getElementById('cal-jump-to-log-btn')?.addEventListener('click', () => {
      state.selectedDate = state.calendarSelectedDate;
      const dayLogs = Repo.getLogsByDate(state.selectedDate);
      if (dayLogs.length > 0) {
        loadLogIntoForm(dayLogs[0]);
      } else {
        selectExerciseForDate(state.selectedExerciseId);
      }
      switchTab('log');
      renderAll();
    });

    // 통계 기간 필터 버튼
    document.querySelectorAll('.period-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.statsPeriod = btn.dataset.period;
        renderStatsTab();
      });
    });

    // 샘플 데이터 채우기 / 초기화 / 백업 / 복원
    document.getElementById('seed-sample-btn')?.addEventListener('click', () => {
      Repo.seedSampleData();
      selectExerciseForDate(state.selectedExerciseId);
      showToast('최근 2주 샘플 운동 기록이 추가되었습니다!');
      renderAll();
    });

    document.getElementById('clear-data-btn')?.addEventListener('click', () => {
      if (confirm('모든 운동 기록을 초기화하시겠습니까?')) {
        Repo.clearAllData();
        applyDefaultFormForExercise(state.selectedExerciseId, false);
        showToast('모든 기록이 초기화되었습니다.');
        renderAll();
      }
    });

    document.getElementById('export-json-btn')?.addEventListener('click', () => {
      const data = Repo.exportBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workout-backup-${Models.formatDateKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('백업 파일이 다운로드되었습니다.');
    });

    document.getElementById('import-json-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const count = Repo.importBackupData(parsed);
          selectExerciseForDate(state.selectedExerciseId);
          showToast(`${count}건의 운동 기록을 복원했습니다!`);
          renderAll();
        } catch (err) {
          alert('백업 파일을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    });

    // 커스텀 운동 종목 추가 모달
    document.getElementById('custom-icon-picker')?.addEventListener('click', (e) => {
      const pick = e.target.closest('[data-pick-icon]');
      if (!pick) return;
      state.customIconKey = pick.dataset.pickIcon;
      const hiddenEl = document.getElementById('custom-ex-icon');
      if (hiddenEl) hiddenEl.value = state.customIconKey;
      renderCustomIconPicker();
    });

    document.getElementById('close-custom-ex-modal')?.addEventListener('click', () => {
      document.getElementById('custom-ex-modal')?.classList.remove('open');
    });

    document.getElementById('save-custom-ex-btn')?.addEventListener('click', () => {
      const nameEl = document.getElementById('custom-ex-name');
      const iconEl = document.getElementById('custom-ex-icon');
      const typeEl = document.querySelector('input[name="custom-ex-type"]:checked');

      const name = (nameEl?.value || '').trim();
      if (!name) {
        alert('운동 이름을 입력해 주세요.');
        return;
      }

      const payload = {
        name,
        icon: iconEl?.value || 'custom_flame',
        recordType: typeEl?.value || Models.RECORD_TYPES.SETS,
      };

      if (state.editingExerciseId) {
        const updatedEx = Repo.updateExercise(state.editingExerciseId, payload);
        state.editingExerciseId = null;
        if (nameEl) nameEl.value = '';
        document.getElementById('custom-ex-modal')?.classList.remove('open');
        if (updatedEx) {
          selectExerciseForDate(updatedEx.id);
        }
        showToast(`'${name}' 종목 설정이 수정되었습니다!`);
        renderAll();
      } else {
        const newEx = Repo.addCustomExercise(payload);
        if (nameEl) nameEl.value = '';
        document.getElementById('custom-ex-modal')?.classList.remove('open');
        selectExerciseForDate(newEx.id);
        showToast(`'${newEx.name}' 종목이 추가되었습니다!`);
        renderAll();
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
