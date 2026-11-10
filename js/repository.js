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
   * 전체 운동 기록 저장하기
   */
  function saveAllLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
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
  }

  /**
   * 기본 운동 종목(삭제되지 않은 항목) + 사용자 커스텀 운동 종목 합쳐서 사용자 지정 순서대로 조회
   */
  function getAllExercises() {
    const deletedSet = new Set(getDeletedDefaultIds());
    const defaults = window.WorkoutModels.DEFAULT_EXERCISES.filter((ex) => !deletedSet.has(ex.id));
    const customs = getCustomExercises();
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
    const newExercise = {
      id: `custom_${Date.now()}`,
      name: (params.name || '').trim(),
      icon: params.icon || 'custom_flame',
      category: params.category || '내 운동',
      recordType,
      hasDistance: recordType === window.WorkoutModels.RECORD_TYPES.TIME,
      hasWeight: recordType === window.WorkoutModels.RECORD_TYPES.SETS,
      defaultMinutes: 30,
      defaultReps: 12,
      defaultSets: 3,
      color: params.color || '#0ea5e9',
      isCustom: true,
    };
    customs.push(newExercise);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EXERCISES, JSON.stringify(customs));
    return newExercise;
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
  }

  /**
   * 삭제했던 기본 운동 종목 다시 복원하기
   */
  function restoreDefaultExercises() {
    localStorage.removeItem(STORAGE_KEYS.DELETED_DEFAULT_EXERCISES);
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
    };
  }

  /**
   * 백업 JSON 데이터 복원
   */
  function importBackupData(data) {
    if (!data || !Array.isArray(data.logs)) {
      throw new Error('올바른 백업 파일 형식이 아닙니다.');
    }
    saveAllLogs(data.logs);
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
      saveExerciseOrder(data.exerciseOrder);
    }
    return data.logs.length;
  }

  /**
   * 전체 기록 초기화
   */
  function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.LOGS);
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
    deleteExercise,
    deleteCustomExercise: deleteExercise,
    restoreDefaultExercises,
    exportBackupData,
    importBackupData,
    clearAllData,
    seedSampleData,
  };
})();
