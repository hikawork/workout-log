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
   * 5대 운동 카테고리 정의 (원형 레이더 차트 축 순서)
   */
  const EXERCISE_CATEGORIES = [
    {
      key: 'cardio',
      label: '유산소',
      shortLabel: '유산소',
      icon: '🏃',
      color: '#38bdf8',
      desc: '달리기·자전거·걷기',
    },
    {
      key: 'strength',
      label: '근력',
      shortLabel: '근력',
      icon: '💪',
      color: '#a3e635',
      desc: '웨이트·맨몸 근력',
    },
    {
      key: 'core',
      label: '코어·밸런스',
      shortLabel: '코어',
      icon: '🧘',
      color: '#a78bfa',
      desc: '플랭크·복근·균형',
    },
    {
      key: 'flexibility',
      label: '유연성·회복',
      shortLabel: '유연성',
      icon: '🌿',
      color: '#34d399',
      desc: '스트레칭·요가·폼롤러',
    },
    {
      key: 'sports',
      label: '스포츠·HIIT',
      shortLabel: '스포츠·HIIT',
      icon: '⚡',
      color: '#fb923c',
      desc: '버피·구기·고강도',
    },
  ];

  /**
   * 기본 제공 운동 종목 목록
   */
  const DEFAULT_EXERCISES = [
    {
      id: 'running',
      name: '달리기',
      icon: '🏃',
      category: '유산소',
      categoryKey: 'cardio',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 30,
      color: '#3b82f6',
    },
    {
      id: 'squat',
      name: '스쿼트',
      icon: '🦵',
      category: '근력',
      categoryKey: 'strength',
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
      categoryKey: 'cardio',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 40,
      color: '#10b981',
    },
    {
      id: 'weight_training',
      name: '근육운동',
      icon: '🏋️',
      category: '근력',
      categoryKey: 'strength',
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
      category: '근력',
      categoryKey: 'strength',
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
      categoryKey: 'cardio',
      recordType: RECORD_TYPES.TIME,
      hasDistance: true,
      defaultMinutes: 45,
      color: '#14b8a6',
    },
    {
      id: 'pullup',
      name: '턱걸이',
      icon: '🤸',
      category: '근력',
      categoryKey: 'strength',
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
      category: '코어·밸런스',
      categoryKey: 'core',
      recordType: RECORD_TYPES.TIME,
      hasDistance: false,
      defaultMinutes: 5,
      color: '#6366f1',
    },
  ];

  function getCategoryMeta(categoryKey) {
    return EXERCISE_CATEGORIES.find((c) => c.key === categoryKey) || EXERCISE_CATEGORIES[0];
  }

  /**
   * 종목 또는 로그 객체에서 5대 카테고리 키('cardio' | 'strength' | 'core' | 'flexibility' | 'sports') 추론
   */
  function resolveCategoryKey(item, allExercises = []) {
    if (!item) return 'strength';
    const validKeys = new Set(EXERCISE_CATEGORIES.map((c) => c.key));

    if (item.categoryKey && validKeys.has(item.categoryKey)) {
      return item.categoryKey;
    }

    // 로그인 경우 연결된 종목에서 먼저 탐색
    if (item.exerciseId && Array.isArray(allExercises) && allExercises.length > 0) {
      const matchedEx = allExercises.find((e) => e.id === item.exerciseId);
      if (matchedEx) {
        return resolveCategoryKey(matchedEx, []);
      }
    }

    const catText = `${item.category || ''} ${item.name || item.exerciseName || ''}`;
    if (/코어|밸런스|플랭크|복근|데드버그/.test(catText)) return 'core';
    if (/유연|회복|스트레칭|요가|필라테스|폼롤러|모빌리티/.test(catText)) return 'flexibility';
    if (/스포츠|HIIT|인터벌|버피|구기|배드민턴|테니스|축구|농구|등산|수영|복싱|줄넘기/.test(catText))
      return 'sports';
    if (/유산소|달리기|러닝|자전거|걷기|산책|사이클/.test(catText)) return 'cardio';
    if (/근력|웨이트|하체|상체|맨몸|스쿼트|팔굽|턱걸이|벤치|데드/.test(catText))
      return 'strength';

    return item.recordType === RECORD_TYPES.TIME ? 'cardio' : 'strength';
  }

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
   * 분·초를 읽기 좋은 문자열로 변환 (예: "30분", "1분 30초", "45초")
   */
  function formatDuration(minutes, seconds) {
    const totalSec = Math.max(
      0,
      Math.round((Number(minutes) || 0) * 60 + (Number(seconds) || 0))
    );
    if (totalSec === 0) return '0초';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}시간`);
    if (mins > 0) parts.push(`${mins}분`);
    if (secs > 0) parts.push(`${secs}초`);
    return parts.join(' ');
  }

  /**
   * 운동 기록 객체 생성 헬퍼
   */
  function createWorkoutLog(params) {
    const now = new Date().toISOString();
    const recordType = params.recordType || RECORD_TYPES.TIME;

    let normMinutes = null;
    let normSeconds = null;
    if (recordType === RECORD_TYPES.TIME) {
      const rawMin = Math.max(0, Number(params.minutes) || 0);
      const rawSec = Math.max(0, Number(params.seconds) || 0);
      const totalSec = Math.max(1, Math.round(rawMin * 60 + rawSec));
      normMinutes = Math.floor(totalSec / 60);
      normSeconds = totalSec % 60;
    }

    return {
      id: params.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: params.date || formatDateKey(),
      exerciseId: params.exerciseId,
      exerciseName: params.exerciseName,
      exerciseIcon: params.exerciseIcon || '🔥',
      categoryKey: params.categoryKey || null,
      recordType,
      // 시간 중심 기록 필드 (분 + 초)
      minutes: normMinutes,
      seconds: normSeconds,
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
      let text = formatDuration(log.minutes, log.seconds);
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
    EXERCISE_CATEGORIES,
    DEFAULT_EXERCISES,
    getCategoryMeta,
    resolveCategoryKey,
    formatDateKey,
    formatKoreanDate,
    formatDuration,
    createWorkoutLog,
    formatLogSummary,
  };
})();
