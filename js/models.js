/**
 * models.js
 * 운동 기록 앱의 데이터 모델 및 기본 운동 종목 정의
 * 추후 모바일 앱(React Native / Capacitor) 및 외부 DB 연동 시에도 동일한 스키마로 사용됩니다.
 */

window.WorkoutModels = (function () {
  /**
   * 기록 타입 정의
   * - 'time': 시간(분) 중심 기록 (+ 선택적 거리 km)
   * - 'sets': 횟수(회) x 세트(세트) 중심 기록 (+ 선택적 무게 kg)
   */
  const RECORD_TYPES = {
    TIME: 'time',
    SETS: 'sets',
  };

  /**
   * 기본 제공 운동 종목 목록
   */
  const DEFAULT_EXERCISES = [
    {
      id: 'running',
      name: '달리기',
      icon: '🏃',
      category: '유산소',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 30,
      color: '#3b82f6',
    },
    {
      id: 'squat',
      name: '스쿼트',
      icon: '🦵',
      category: '하체/근력',
      recordType: RECORD_TYPES.SETS,
      hasWeight: true,
      defaultReps: 15,
      defaultSets: 3,
      color: '#ef4444',
    },
    {
      id: 'cycling',
      name: '자전거',
      icon: '🚴',
      category: '유산소',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 40,
      color: '#10b981',
    },
    {
      id: 'weight_training',
      name: '근육운동',
      icon: '🏋️',
      category: '웨이트',
      recordType: RECORD_TYPES.SETS,
      hasWeight: true,
      defaultReps: 12,
      defaultSets: 4,
      color: '#8b5cf6',
    },
    {
      id: 'pushup',
      name: '팔굽혀펴기',
      icon: '💪',
      category: '상체/맨몸',
      recordType: RECORD_TYPES.SETS,
      hasWeight: false,
      defaultReps: 15,
      defaultSets: 3,
      color: '#f59e0b',
    },
    {
      id: 'walking',
      name: '걷기/산책',
      icon: '🚶',
      category: '유산소',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 45,
      color: '#14b8a6',
    },
    {
      id: 'pullup',
      name: '턱걸이',
      icon: '🤸',
      category: '상체/맨몸',
      recordType: RECORD_TYPES.SETS,
      hasWeight: true,
      defaultReps: 8,
      defaultSets: 3,
      color: '#ec4899',
    },
    {
      id: 'plank',
      name: '플랭크',
      icon: '🧘',
      category: '코어',
      recordType: RECORD_TYPES.TIME,
      hasDistance: false,
      defaultMinutes: 5,
      color: '#6366f1',
    },
  ];

  /**
   * 날짜 객체를 YYYY-MM-DD 문자열로 변환 (로컬 시간대 기준)
   */
  function formatDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * YYYY-MM-DD 문자열을 한국어 날짜 표기로 변환
   */
  function formatKoreanDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[dateObj.getDay()];
    return `${y}년 ${m}월 ${d}일 (${dayName})`;
  }

  /**
   * 운동 기록 객체 생성 헬퍼
   */
  function createWorkoutLog(params) {
    const now = new Date().toISOString();
    const recordType = params.recordType || RECORD_TYPES.TIME;

    return {
      id: params.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: params.date || formatDateKey(),
      exerciseId: params.exerciseId,
      exerciseName: params.exerciseName,
      exerciseIcon: params.exerciseIcon || '🔥',
      recordType,
      // 시간 중심 기록 필드
      minutes: recordType === RECORD_TYPES.TIME ? Math.max(1, Number(params.minutes) || 0) : null,
      distanceKm:
        recordType === RECORD_TYPES.TIME && params.distanceKm
          ? Math.max(0, Number(params.distanceKm))
          : null,
      // 횟수 x 세트 중심 기록 필드
      reps: recordType === RECORD_TYPES.SETS ? Math.max(1, Number(params.reps) || 0) : null,
      sets: recordType === RECORD_TYPES.SETS ? Math.max(1, Number(params.sets) || 0) : null,
      weightKg:
        recordType === RECORD_TYPES.SETS && params.weightKg
          ? Math.max(0, Number(params.weightKg))
          : null,
      // 공통 메모 및 타임스탬프
      note: (params.note || '').trim(),
      createdAt: params.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * 운동 기록 한 줄 요약 텍스트 생성
   */
  function formatLogSummary(log) {
    if (log.recordType === RECORD_TYPES.TIME) {
      let text = `${log.minutes}분`;
      if (log.distanceKm && log.distanceKm > 0) {
        text += ` · ${log.distanceKm}km`;
      }
      return text;
    } else {
      const totalReps = (log.reps || 0) * (log.sets || 0);
      let text = `${log.reps}회 × ${log.sets}세트 (총 ${totalReps}회)`;
      if (log.weightKg && log.weightKg > 0) {
        text = `${log.weightKg}kg · ` + text;
      }
      return text;
    }
  }

  return {
    RECORD_TYPES,
    DEFAULT_EXERCISES,
    formatDateKey,
    formatKoreanDate,
    createWorkoutLog,
    formatLogSummary,
  };
})();
