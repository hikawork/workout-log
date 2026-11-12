/**
 * repository.js
 * 데이터 저장소 계층 (Repository Pattern)
 * 현재는 브라우저 내장 LocalStorage를 사용하며,
 * 추후 DB(Supabase, Firebase, SQLite 등) 연동 시 이 파일의 내부 구현만 교체하면 됩니다.
 */

window.WorkoutRepository = (function () {
  const STORAGE_KEYS = {
    LOGS: 'workout_app_logs_v1',
    CUSTOM_EXERCISES: 'workout_app_custom_exercises_v1',
    DELETED_DEFAULT_EXERCISES: 'workout_app_deleted_defaults_v1',
    EXERCISE_ORDER: 'workout_app_exercise_order_v1',
    EXERCISE_OVERRIDES: 'workout_app_exercise_overrides_v1',
    BALANCE_CATEGORIES: 'workout_app_balance_categories_v1',
  };

  /**
   * 전체 운동 기록 불러오기 (날짜 최신순, 같은 날짜 내에서는 사용자 지정 순서 우선 정렬)
   */
  function getAllLogs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
        const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
        if (orderA !== orderB) return orderA - orderB;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    } catch (e) {
      console.error('운동 기록을 불러오는 중 오류 발생:', e);
      return [];
    }
  }

  /**
   * 전체 운동 기록 저장하기 (+ 연결된 로컬 파일이 있으면 자동 저장 트리거)
   */
  function saveAllLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
      scheduleAutoFileSave();
      return true;
    } catch (e) {
      console.error('운동 기록 저장 중 오류 발생:', e);
      return false;
    }
  }

  /**
   * 특정 날짜(YYYY-MM-DD)의 운동 기록 조회
   */
  function getLogsByDate(dateStr) {
    return getAllLogs().filter((log) => log.date === dateStr);
  }

  /**
   * 특정 기간(startDate ~ endDate, YYYY-MM-DD 포함)의 운동 기록 조회
   */
  function getLogsByDateRange(startDate, endDate) {
    return getAllLogs().filter((log) => log.date >= startDate && log.date <= endDate);
  }

  /**
   * 운동 기록 추가
   */
  function addLog(logParams) {
    const newLog = window.WorkoutModels.createWorkoutLog(logParams);
    const logs = getAllLogs();
    logs.push(newLog);
    saveAllLogs(logs);
    return newLog;
  }

  /**
   * 운동 기록 수정
   */
  function updateLog(id, updatedFields) {
    const logs = getAllLogs();
    const idx = logs.findIndex((item) => item.id === id);
    if (idx === -1) return null;

    const prevSortOrder = logs[idx].sortOrder;
    const merged = {
      ...logs[idx],
      ...updatedFields,
      id,
      createdAt: logs[idx].createdAt,
    };
    const updatedLog = window.WorkoutModels.createWorkoutLog(merged);
    if (typeof prevSortOrder === 'number') {
      updatedLog.sortOrder = prevSortOrder;
    }
    logs[idx] = updatedLog;
    saveAllLogs(logs);
    return updatedLog;
  }

  /**
   * 특정 날짜의 운동 기록 순서(드래그 앤 드롭) 변경 저장
   */
  function reorderLogsForDate(dateStr, orderedLogIds) {
    if (!Array.isArray(orderedLogIds)) return;
    const orderMap = {};
    orderedLogIds.forEach((id, index) => {
      orderMap[id] = index;
    });

    const logs = getAllLogs();
    logs.forEach((log) => {
      if (log.date === dateStr && orderMap[log.id] !== undefined) {
        log.sortOrder = orderMap[log.id];
      }
    });
    saveAllLogs(logs);
  }

  /**
   * 운동 기록 삭제
   */
  function deleteLog(id) {
    const logs = getAllLogs();
    const filtered = logs.filter((item) => item.id !== id);
    saveAllLogs(filtered);
    return filtered.length !== logs.length;
  }

  /**
   * 사용자가 삭제한 기본 운동 종목 ID 목록 조회
   */
  function getDeletedDefaultIds() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DEFAULT_EXERCISES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 사용자가 지정한 운동 종목 정렬 순서(ID 배열) 조회 및 저장
   */
  function getExerciseOrder() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXERCISE_ORDER);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveExerciseOrder(orderedIds) {
    if (!Array.isArray(orderedIds)) return;
    localStorage.setItem(STORAGE_KEYS.EXERCISE_ORDER, JSON.stringify(orderedIds));
    scheduleAutoFileSave();
  }

  /**
   * 기본 운동 종목에 대한 사용자 수정(이름/아이콘/기록타입) 오버라이드 조회
   */
  function getExerciseOverrides() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.EXERCISE_OVERRIDES);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * 기본 운동 종목(삭제되지 않은 항목 + 수정 오버라이드 반영) + 사용자 커스텀 운동 종목 합쳐서 조회
   */
  function getAllExercises() {
    const deletedSet = new Set(getDeletedDefaultIds());
    const overrides = getExerciseOverrides();
    const defaults = window.WorkoutModels.DEFAULT_EXERCISES.filter((ex) => !deletedSet.has(ex.id)).map(
      (ex) => {
        const merged = overrides[ex.id] ? { ...ex, ...overrides[ex.id] } : { ...ex };
        merged.categoryKey = window.WorkoutModels.resolveCategoryKey(merged);
        merged.category = window.WorkoutModels.getCategoryMeta(merged.categoryKey).label;
        return merged;
      }
    );
    const customs = getCustomExercises().map((ex) => {
      const catKey = window.WorkoutModels.resolveCategoryKey(ex);
      return {
        ...ex,
        categoryKey: catKey,
        category: window.WorkoutModels.getCategoryMeta(catKey).label,
      };
    });
    const combined = [...defaults, ...customs];

    const savedOrder = getExerciseOrder();
    if (savedOrder.length === 0) return combined;

    const orderMap = {};
    savedOrder.forEach((id, idx) => {
      orderMap[id] = idx;
    });

    return combined.sort((a, b) => {
      const idxA = orderMap[a.id] !== undefined ? orderMap[a.id] : 9999;
      const idxB = orderMap[b.id] !== undefined ? orderMap[b.id] : 9999;
      return idxA - idxB;
    });
  }

  /**
   * 사용자 커스텀 운동 종목만 조회
   */
  function getCustomExercises() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXERCISES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * 사용자 커스텀 운동 종목 추가
   */
  function addCustomExercise(params) {
    const customs = getCustomExercises();
    const recordType = params.recordType || window.WorkoutModels.RECORD_TYPES.SETS;
    const categoryKey =
      params.categoryKey ||
      (recordType === window.WorkoutModels.RECORD_TYPES.TIME ? 'cardio' : 'strength');
    const categoryMeta = window.WorkoutModels.getCategoryMeta(categoryKey);
    const newExercise = {
      id: `custom_${Date.now()}`,
      name: (params.name || '').trim(),
      icon: params.icon || 'custom_flame',
      categoryKey,
      category: categoryMeta.label,
      recordType,
      hasDistance: recordType === window.WorkoutModels.RECORD_TYPES.TIME,
      hasWeight: recordType === window.WorkoutModels.RECORD_TYPES.SETS,
      defaultMinutes: 30,
      defaultReps: 12,
      defaultSets: 3,
      color: params.color || categoryMeta.color || '#0ea5e9',
      isCustom: true,
    };
    customs.push(newExercise);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(customs));
    scheduleAutoFileSave();
    return newExercise;
  }

  /**
   * 운동 종목 정보 수정 (이름, 아이콘, 기록 방식, 카테고리 변경 - 커스텀 및 기본 종목 모두 지원)
   */
  function updateExercise(exerciseId, params) {
    const name = (params.name || '').trim();
    const icon = params.icon || 'custom_flame';
    const recordType = params.recordType || window.WorkoutModels.RECORD_TYPES.SETS;
    const categoryKey =
      params.categoryKey ||
      window.WorkoutModels.resolveCategoryKey({ ...params, recordType }, getAllExercises());
    const categoryLabel = window.WorkoutModels.getCategoryMeta(categoryKey).label;
    const hasDistance = recordType === window.WorkoutModels.RECORD_TYPES.TIME;
    const hasWeight = recordType === window.WorkoutModels.RECORD_TYPES.SETS;

    const customs = getCustomExercises();
    const customIdx = customs.findIndex((ex) => ex.id === exerciseId);

    if (customIdx !== -1) {
      customs[customIdx] = {
        ...customs[customIdx],
        name: name || customs[customIdx].name,
        icon,
        categoryKey,
        category: categoryLabel,
        recordType,
        hasDistance,
        hasWeight,
      };
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(customs));
    } else {
      const overrides = getExerciseOverrides();
      overrides[exerciseId] = {
        name,
        icon,
        categoryKey,
        category: categoryLabel,
        recordType,
        hasDistance,
        hasWeight,
      };
      localStorage.setItem(STORAGE_KEYS.EXERCISE_OVERRIDES, JSON.stringify(overrides));
    }

    // 기존 운동 기록들 중 해당 종목의 이름/아이콘/카테고리도 함께 동기화
    const logs = getAllLogs();
    let logsModified = false;
    logs.forEach((log) => {
      if (log.exerciseId === exerciseId) {
        if (name) log.exerciseName = name;
        log.exerciseIcon = icon;
        log.categoryKey = categoryKey;
        logsModified = true;
      }
    });
    if (logsModified) {
      saveAllLogs(logs);
    } else {
      scheduleAutoFileSave();
    }

    return getAllExercises().find((ex) => ex.id === exerciseId);
  }

  /**
   * 운동 종목 삭제 (기본 종목 & 커스텀 종목 모두 삭제 가능)
   */
  function deleteExercise(exerciseId) {
    const isDefault = window.WorkoutModels.DEFAULT_EXERCISES.some((ex) => ex.id === exerciseId);
    if (isDefault) {
      const deletedIds = getDeletedDefaultIds();
      if (!deletedIds.includes(exerciseId)) {
        deletedIds.push(exerciseId);
        localStorage.setItem(STORAGE_KEYS.DELETED_DEFAULT_EXERCISES, JSON.stringify(deletedIds));
      }
    } else {
      const customs = getCustomExercises().filter((ex) => ex.id !== exerciseId);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(customs));
    }
    scheduleAutoFileSave();
  }

  /**
   * 삭제했던 기본 운동 종목 다시 복원하기
   */
  function restoreDefaultExercises() {
    localStorage.removeItem(STORAGE_KEYS.DELETED_DEFAULT_EXERCISES);
    localStorage.removeItem(STORAGE_KEYS.EXERCISE_OVERRIDES);
    scheduleAutoFileSave();
  }

  /**
   * 사용자가 선택한 밸런스 그래프 카테고리 키 배열 조회 (3~8개)
   */
  function getBalanceCategoryKeys() {
    const {
      EXERCISE_CATEGORIES,
      DEFAULT_BALANCE_CATEGORIES,
      BALANCE_MIN_COUNT,
      BALANCE_MAX_COUNT,
    } = window.WorkoutModels;
    const validSet = new Set(EXERCISE_CATEGORIES.map((c) => c.key));
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BALANCE_CATEGORIES);
      if (!raw) return [...DEFAULT_BALANCE_CATEGORIES];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...DEFAULT_BALANCE_CATEGORIES];
      const cleaned = parsed.filter((k, idx) => validSet.has(k) && parsed.indexOf(k) === idx);
      if (cleaned.length < BALANCE_MIN_COUNT) return [...DEFAULT_BALANCE_CATEGORIES];
      return cleaned.slice(0, BALANCE_MAX_COUNT);
    } catch (e) {
      return [...DEFAULT_BALANCE_CATEGORIES];
    }
  }

  /**
   * 사용자가 선택한 밸런스 그래프 카테고리 키 배열 저장 (3~8개)
   */
  function saveBalanceCategoryKeys(keys) {
    const { EXERCISE_CATEGORIES, BALANCE_MIN_COUNT, BALANCE_MAX_COUNT } = window.WorkoutModels;
    const validSet = new Set(EXERCISE_CATEGORIES.map((c) => c.key));
    if (!Array.isArray(keys)) return false;
    const cleaned = keys
      .filter((k, idx) => validSet.has(k) && keys.indexOf(k) === idx)
      .slice(0, BALANCE_MAX_COUNT);
    if (cleaned.length < BALANCE_MIN_COUNT) return false;
    localStorage.setItem(STORAGE_KEYS.BALANCE_CATEGORIES, JSON.stringify(cleaned));
    scheduleAutoFileSave();
    return true;
  }

  /**
   * 데이터 백업용 JSON 객체 생성
   */
  function exportBackupData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      logs: getAllLogs(),
      customExercises: getCustomExercises(),
      deletedDefaultIds: getDeletedDefaultIds(),
      exerciseOrder: getExerciseOrder(),
      exerciseOverrides: getExerciseOverrides(),
      balanceCategories: getBalanceCategoryKeys(),
    };
  }

  /**
   * 백업 JSON 데이터 복원
   */
  function importBackupData(data) {
    if (!data || !Array.isArray(data.logs)) {
      throw new Error('올바른 백업 파일 형식이 아닙니다.');
    }
    if (Array.isArray(data.customExercises)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(data.customExercises));
    }
    if (Array.isArray(data.deletedDefaultIds)) {
      localStorage.setItem(
        STORAGE_KEYS.DELETED_DEFAULT_EXERCISES,
        JSON.stringify(data.deletedDefaultIds)
      );
    }
    if (Array.isArray(data.exerciseOrder)) {
      localStorage.setItem(STORAGE_KEYS.EXERCISE_ORDER, JSON.stringify(data.exerciseOrder));
    }
    if (data.exerciseOverrides && typeof data.exerciseOverrides === 'object') {
      localStorage.setItem(
        STORAGE_KEYS.EXERCISE_OVERRIDES,
        JSON.stringify(data.exerciseOverrides)
      );
    }
    if (Array.isArray(data.balanceCategories)) {
      saveBalanceCategoryKeys(data.balanceCategories);
    }
    saveAllLogs(data.logs);
    return data.logs.length;
  }

  /**
   * 전체 기록 초기화
   */
  function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    scheduleAutoFileSave();
  }

  /**
   * 통계 및 달력 확인을 위한 최근 2주 샘플 데이터 생성
   */
  function seedSampleData() {
    const today = new Date();
    const samplePlans = [
      {
        offset: 0,
        items: [
          { exerciseId: 'running', minutes: 35, distanceKm: 5.2, note: '상쾌한 아침 조깅' },
          { exerciseId: 'squat', reps: 15, sets: 4, weightKg: 40, note: '하체 집중' },
        ],
      },
      {
        offset: -1,
        items: [
          { exerciseId: 'weight_training', reps: 12, sets: 4, weightKg: 50, note: '가슴/어깨 루틴' },
          { exerciseId: 'plank', minutes: 5, note: '마무리 코어' },
        ],
      },
      {
        offset: -2,
        items: [
          { exerciseId: 'cycling', minutes: 45, distanceKm: 14.0, note: '한강 라이딩' },
        ],
      },
      {
        offset: -4,
        items: [
          { exerciseId: 'squat', reps: 20, sets: 3, weightKg: 0, note: '맨몸 스쿼트' },
          { exerciseId: 'pushup', reps: 15, sets: 4, note: '푸시업 루틴' },
          { exerciseId: 'pullup', reps: 8, sets: 3, note: '등 운동' },
        ],
      },
      {
        offset: -6,
        items: [
          { exerciseId: 'running', minutes: 30, distanceKm: 4.5, note: '트레드밀 인터벌' },
          { exerciseId: 'weight_training', reps: 10, sets: 4, weightKg: 55, note: '벤치프레스' },
        ],
      },
      {
        offset: -8,
        items: [
          { exerciseId: 'walking', minutes: 50, distanceKm: 4.0, note: '저녁 빠른 걸음 산책' },
        ],
      },
      {
        offset: -10,
        items: [
          { exerciseId: 'cycling', minutes: 60, distanceKm: 18.5, note: '주말 장거리 자전거' },
          { exerciseId: 'squat', reps: 15, sets: 3, weightKg: 30, note: '' },
        ],
      },
      {
        offset: -12,
        items: [
          { exerciseId: 'running', minutes: 25, distanceKm: 3.8, note: '가벼운 러닝' },
          { exerciseId: 'pushup', reps: 20, sets: 3, note: '' },
        ],
      },
    ];

    const allExercises = getAllExercises();
    const existingLogs = getAllLogs();

    samplePlans.forEach((plan) => {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + plan.offset);
      const dateStr = window.WorkoutModels.formatDateKey(targetDate);

      plan.items.forEach((item) => {
        const ex = allExercises.find((e) => e.id === item.exerciseId);
        if (!ex) return;
        const newLog = window.WorkoutModels.createWorkoutLog({
          date: dateStr,
          exerciseId: ex.id,
          exerciseName: ex.name,
          exerciseIcon: ex.icon,
          recordType: ex.recordType,
          minutes: item.minutes,
          distanceKm: item.distanceKm,
          reps: item.reps,
          sets: item.sets,
          weightKg: item.weightKg,
          note: item.note,
        });
        existingLogs.push(newLog);
      });
    });

    saveAllLogs(existingLogs);
    return existingLogs.length;
  }

  // =========================================================================
  // 실시간 로컬 파일 자동 저장 (File System Access API + IndexedDB 핸들 보관)
  // =========================================================================
  const IDB_NAME = 'workout_file_sync_db_v1';
  const IDB_STORE = 'handles';
  const IDB_KEY = 'active_workout_file';
  const MOBILE_AUTO_FILE_KEY = 'workout_mobile_auto_file_v1';

  let activeFileHandle = null;
  let syncStatus = 'disconnected'; // 'disconnected' | 'needs_permission' | 'connected'
  let lastSavedTimeStr = '';
  let syncListeners = [];
  let autoSaveTimer = null;

  function isFileSystemAccessSupported() {
    return (
      typeof window.showSaveFilePicker === 'function' &&
      typeof window.showOpenFilePicker === 'function'
    );
  }

  function triggerBrowserFileDownload(fileName = 'workout-data.json') {
    try {
      const payload = JSON.stringify(exportBackupData(), null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const now = new Date();
      lastSavedTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      notifySyncListeners();
      return true;
    } catch (e) {
      return false;
    }
  }

  function onFileSyncChange(listener) {
    if (typeof listener === 'function') {
      syncListeners.push(listener);
    }
  }

  function notifySyncListeners() {
    const info = getFileSyncStatus();
    syncListeners.forEach((fn) => {
      try {
        fn(info);
      } catch (e) {}
    });
  }

  function getFileSyncStatus() {
    const supported = isFileSystemAccessSupported();
    const isMobileConnected =
      !supported && localStorage.getItem(MOBILE_AUTO_FILE_KEY) === '1';
    return {
      supported,
      status: supported ? syncStatus : isMobileConnected ? 'connected' : 'disconnected',
      fileName: activeFileHandle
        ? activeFileHandle.name
        : isMobileConnected
        ? 'workout-data.json (내 파일)'
        : '',
      lastSavedAt: lastSavedTimeStr,
    };
  }

  function openHandleDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveHandleToIDB(handle) {
    try {
      const db = await openHandleDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  async function loadHandleFromIDB() {
    try {
      const db = await openHandleDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async function removeHandleFromIDB() {
    try {
      const db = await openHandleDB();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * 앱 시작 시 이전에 연결했던 파일 핸들이 있는지 확인
   */
  async function initSavedFileHandle() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    } catch (e) {}

    if (!isFileSystemAccessSupported()) {
      notifySyncListeners();
      return;
    }
    const handle = await loadHandleFromIDB();
    if (!handle) {
      syncStatus = 'disconnected';
      notifySyncListeners();
      return;
    }

    activeFileHandle = handle;
    try {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        syncStatus = 'connected';
        await writeCurrentDataToFile();
      } else {
        syncStatus = 'needs_permission';
      }
    } catch (e) {
      syncStatus = 'needs_permission';
    }
    notifySyncListeners();
  }

  /**
   * 연결된 파일에 현재 데이터를 즉시 기록
   */
  async function writeCurrentDataToFile() {
    if (!activeFileHandle || syncStatus !== 'connected') return false;
    try {
      const writable = await activeFileHandle.createWritable();
      const payload = JSON.stringify(exportBackupData(), null, 2);
      await writable.write(payload);
      await writable.close();
      const now = new Date();
      lastSavedTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      notifySyncListeners();
      return true;
    } catch (e) {
      console.error('로컬 파일 자동 저장 실패:', e);
      return false;
    }
  }

  /**
   * 데이터 변경 시 디바운스로 로컬 파일에 자동 덮어쓰기 (모바일은 자동 파일 다운로드)
   */
  function scheduleAutoFileSave() {
    if (!isFileSystemAccessSupported()) {
      if (localStorage.getItem(MOBILE_AUTO_FILE_KEY) === '1') {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
          triggerBrowserFileDownload('workout-data.json');
        }, 300);
      }
      return;
    }
    if (!activeFileHandle || syncStatus !== 'connected') return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      writeCurrentDataToFile();
    }, 120);
  }

  /**
   * 1. 새 저장 파일을 내 기기에 만들고 자동 저장 연결 (PC + 모바일 모두 지원)
   */
  async function connectNewSyncFile() {
    if (!isFileSystemAccessSupported()) {
      localStorage.setItem(MOBILE_AUTO_FILE_KEY, '1');
      triggerBrowserFileDownload('workout-data.json');
      notifySyncListeners();
      return 'workout-data.json';
    }
    const handle = await window.showSaveFilePicker({
      suggestedName: 'workout-data.json',
      types: [
        {
          description: '오늘운동 데이터 파일 (JSON)',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    activeFileHandle = handle;
    syncStatus = 'connected';
    await saveHandleToIDB(handle);
    await writeCurrentDataToFile();
    notifySyncListeners();
    return handle.name;
  }

  /**
   * 2. 내 기기에 있던 기존 데이터 파일을 열어서 복원 + 자동 저장 연결 (PC + 모바일 모두 지원)
   */
  async function openExistingSyncFile() {
    if (!isFileSystemAccessSupported()) {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          document.body.removeChild(input);
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const parsed = JSON.parse(ev.target.result);
              localStorage.setItem(MOBILE_AUTO_FILE_KEY, '1');
              const count = importBackupData(parsed);
              notifySyncListeners();
              resolve({ fileName: file.name || 'workout-data.json', count });
            } catch (err) {
              reject(new Error('파일 형식이 올바르지 않습니다.'));
            }
          };
          reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
          reader.readAsText(file);
        });

        input.click();
      });
    }
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: '오늘운동 데이터 파일 (JSON)',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    if (!handle) return null;

    const perm = await handle.requestPermission({ mode: 'readwrite' });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);

    activeFileHandle = handle;
    syncStatus = perm === 'granted' ? 'connected' : 'needs_permission';
    await saveHandleToIDB(handle);
    importBackupData(parsed);
    if (syncStatus === 'connected') {
      await writeCurrentDataToFile();
    }
    notifySyncListeners();
    return { fileName: handle.name, count: Array.isArray(parsed.logs) ? parsed.logs.length : 0 };
  }

  /**
   * 3. 이전에 연결했던 파일 권한 1클릭 재승인 (브라우저 재시작 후)
   */
  async function reconnectRememberedFile() {
    if (!activeFileHandle) return false;
    const perm = await activeFileHandle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      syncStatus = 'connected';
      // 파일에 저장된 최신 데이터가 있고 로컬이 비어있다면 파일에서 자동 복원
      try {
        const file = await activeFileHandle.getFile();
        const text = await file.text();
        if (text.trim()) {
          const parsed = JSON.parse(text);
          if (
            parsed &&
            Array.isArray(parsed.logs) &&
            getAllLogs().length === 0 &&
            parsed.logs.length > 0
          ) {
            importBackupData(parsed);
          }
        }
      } catch (e) {}
      await writeCurrentDataToFile();
      notifySyncListeners();
      return true;
    }
    return false;
  }

  /**
   * 4. 파일 자동 저장 연결 해제
   */
  async function disconnectSyncFile() {
    activeFileHandle = null;
    syncStatus = 'disconnected';
    lastSavedTimeStr = '';
    localStorage.removeItem(MOBILE_AUTO_FILE_KEY);
    await removeHandleFromIDB();
    notifySyncListeners();
  }

  /**
   * 5. 현재 연결된 파일은 유지한 채로, 별도의 파일 이름으로 백업본 저장 (PC + 모바일 모두 지원)
   */
  async function saveBackupCopyAs() {
    const todayStr = window.WorkoutModels.formatDateKey(new Date());
    const defaultName = `workout-backup-${todayStr}.json`;

    if (isFileSystemAccessSupported()) {
      const backupHandle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [
          {
            description: '오늘운동 백업 파일 (JSON)',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await backupHandle.createWritable();
      const payload = JSON.stringify(exportBackupData(), null, 2);
      await writable.write(payload);
      await writable.close();
      return backupHandle.name;
    }

    // 모바일 및 일반 브라우저: 저장할 파일 이름을 직접 입력받아 다운로드
    const inputName = window.prompt(
      '백업 저장할 파일 이름을 입력해 주세요:',
      defaultName
    );
    if (inputName === null) {
      const abortErr = new Error('취소됨');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    let cleanName = inputName.trim() || defaultName;
    if (!cleanName.toLowerCase().endsWith('.json')) {
      cleanName += '.json';
    }

    const payload = JSON.stringify(exportBackupData(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return cleanName;
  }

  return {
    getAllLogs,
    getLogsByDate,
    getLogsByDateRange,
    addLog,
    updateLog,
    reorderLogsForDate,
    deleteLog,
    getAllExercises,
    getCustomExercises,
    getDeletedDefaultIds,
    saveExerciseOrder,
    addCustomExercise,
    updateExercise,
    deleteExercise,
    deleteCustomExercise: deleteExercise,
    restoreDefaultExercises,
    getBalanceCategoryKeys,
    saveBalanceCategoryKeys,
    exportBackupData,
    importBackupData,
    clearAllData,
    seedSampleData,
    // 로컬 파일 실시간 자동 동기화 및 백업 API
    isFileSystemAccessSupported,
    initSavedFileHandle,
    onFileSyncChange,
    getFileSyncStatus,
    connectNewSyncFile,
    openExistingSyncFile,
    reconnectRememberedFile,
    disconnectSyncFile,
    saveBackupCopyAs,
  };
})();
