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
   * 전체 운동 카테고리 풀 (11종: 기본 3대 축 + 전문 피트니스/스포츠 8종)
   * 사용자는 이 중 3~8개를 선택해 내 운동 밸런스 그래프를 구성합니다.
   */
  const EXERCISE_CATEGORIES = [
    {
      key: 'cardio',
      label: '유산소',
      shortLabel: '유산소',
      icon: '🏃',
      color: '#38bdf8',
      desc: '달리기·자전거·걷기 등 심폐 지구력',
      recommend: '시간(분·초)',
    },
    {
      key: 'strength',
      label: '근력',
      shortLabel: '근력',
      icon: '💪',
      color: '#a3e635',
      desc: '스쿼트·웨이트·팔굽혀펴기·턱걸이',
      recommend: '횟수×세트',
    },
    {
      key: 'flexibility',
      label: '유연성',
      shortLabel: '유연성',
      icon: '🤸',
      color: '#34d399',
      desc: '전신 스트레칭·유연성 향상 루틴',
      recommend: '시간(분·초)',
    },
    {
      key: 'core',
      label: '코어 · 밸런스',
      shortLabel: '코어·밸런스',
      icon: '🧘',
      color: '#a78bfa',
      desc: '플랭크·데드버그·버드독·보수볼 균형',
      recommend: '분·초 / 세트',
    },
    {
      key: 'hiit',
      label: '고강도 인터벌 · 서킷',
      shortLabel: '인터벌·HIIT',
      icon: '🔥',
      color: '#fb923c',
      desc: '버피·타바타·케틀벨 스윙·배틀 로프',
      recommend: '분·초 / 세트',
    },
    {
      key: 'power',
      label: '파워 · 민첩성',
      shortLabel: '파워·민첩',
      icon: '⚡',
      color: '#facc15',
      desc: '박스 점프·점프 스쿼트·스프린트·래더',
      recommend: '세트 / 초',
    },
    {
      key: 'mobility',
      label: '가동성 · 회복',
      shortLabel: '가동성·회복',
      icon: '🌿',
      color: '#2dd4bf',
      desc: '폼롤러 근막이완·관절 모빌리티·쿨다운',
      recommend: '시간(분·초)',
    },
    {
      key: 'sports',
      label: '스포츠 · 구기 · 라켓',
      shortLabel: '스포츠·구기',
      icon: '🏸',
      color: '#60a5fa',
      desc: '배드민턴·테니스·탁구·축구·농구·클라이밍·수영·골프',
      recommend: '시간(분·초)',
    },
    {
      key: 'combat',
      label: '복싱 · 무술',
      shortLabel: '복싱·무술',
      icon: '🥊',
      color: '#f43f5e',
      desc: '쉐도우 복싱·샌드백·킥복싱·주짓수·유도',
      recommend: '시간(분·초)',
    },
    {
      key: 'mindbody',
      label: '마인드바디 · 자세교정',
      shortLabel: '자세·요가',
      icon: '🕊️',
      color: '#c084fc',
      desc: '요가·필라테스·코어 호흡·거북목 교정',
      recommend: '시간(분·초)',
    },
    {
      key: 'outdoor',
      label: '야외 · 일상 활동',
      shortLabel: '야외·일상',
      icon: '⛰️',
      color: '#4ade80',
      desc: '등산/트레킹·계단 오르기·트레일 러닝·스케이트',
      recommend: '분·초 + 거리',
    },
  ];

  const DEFAULT_BALANCE_CATEGORIES = ['cardio', 'strength', 'core', 'flexibility', 'sports'];
  const BALANCE_MIN_COUNT = 3;
  const BALANCE_MAX_COUNT = 8;

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
    if (/가동성|회복|폼롤러|모빌리티|근막이완|쿨다운/.test(catText)) return 'mobility';
    if (/인터벌|서킷|HIIT|버피|타바타|케틀벨|배틀\s*로프|마운틴\s*클라이머/i.test(catText))
      return 'hiit';
    if (/파워|민첩|플라이오|박스\s*점프|점프\s*스쿼트|스프린트|래더/.test(catText)) return 'power';
    if (/복싱|무술|샌드백|킥복싱|주짓수|유도|태권도/.test(catText)) return 'combat';
    if (/마인드바디|자세교정|요가|필라테스|거북목|라운드숄더/.test(catText)) return 'mindbody';
    if (/야외|일상|등산|트레킹|계단|트레일|인라인|스케이트/.test(catText)) return 'outdoor';
    if (/코어|밸런스|플랭크|복근|데드버그|버드독|보수볼/.test(catText)) return 'core';
    if (/유연|스트레칭/.test(catText)) return 'flexibility';
    if (/스포츠|구기|라켓|배드민턴|테니스|탁구|축구|농구|클라이밍|수영|골프/.test(catText))
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
    DEFAULT_BALANCE_CATEGORIES,
    BALANCE_MIN_COUNT,
    BALANCE_MAX_COUNT,
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
