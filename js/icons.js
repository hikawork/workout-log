/**
 * icons.js
 * 기본 OS 이모지 대신 세련된 피트니스 전용 커스텀 듀오톤 SVG 벡터 아이콘 시스템
 */

window.WorkoutIcons = (function () {
  const EXERCISE_SVGS = {
    running: {
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
      glow: 'rgba(56, 189, 248, 0.28)',
      accent: '#38bdf8',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="15" cy="4" r="2"/>
        <path d="M10.5 9.5L7 11l-1.5 3"/>
        <path d="M10.5 9.5l4 1.5 3.5-2"/>
        <path d="M14.5 11l-2.5 5-4.5 1"/>
        <path d="M12 16l3.5 2.5 1 3.5"/>
        <path d="M3 19h3" opacity="0.5"/>
        <path d="M2 15h4" opacity="0.5"/>
      </svg>`,
    },
    squat: {
      gradient: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
      glow: 'rgba(251, 113, 133, 0.28)',
      accent: '#fb7185',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="4" r="2"/>
        <path d="M4 8h16"/>
        <path d="M2 6v4M22 6v4"/>
        <path d="M9 8l-1 5 4 2 4-2-1-5"/>
        <path d="M8 13l-2 4v4"/>
        <path d="M16 13l2 4v4"/>
      </svg>`,
    },
    cycling: {
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      glow: 'rgba(52, 211, 153, 0.28)',
      accent: '#34d399',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1.8"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>`,
    },
    weight_training: {
      gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
      glow: 'rgba(167, 139, 250, 0.28)',
      accent: '#a78bfa',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.5 6.5L17.5 17.5"/>
        <path d="M3 10l7-7M14 21l7-7"/>
        <path d="M2 6l4-4M18 22l4-4"/>
        <path d="M5 12l7-7M12 19l7-7" opacity="0.45"/>
      </svg>`,
    },
    pushup: {
      gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
      glow: 'rgba(251, 191, 36, 0.28)',
      accent: '#fbbf24',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="19" cy="9" r="2"/>
        <path d="M3 17l11-5 3 2"/>
        <path d="M15 14v5"/>
        <path d="M3 17l-1 2"/>
        <path d="M2 19h20" opacity="0.45"/>
      </svg>`,
    },
    walking: {
      gradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)',
      glow: 'rgba(45, 212, 191, 0.28)',
      accent: '#2dd4bf',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="13" cy="4" r="2"/>
        <path d="M10 9l3-1 3 3v3"/>
        <path d="M13 8l-2 6-3 6"/>
        <path d="M11 14l4 2 2 5"/>
        <path d="M10 9l-3 3"/>
      </svg>`,
    },
    pullup: {
      gradient: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)',
      glow: 'rgba(244, 114, 182, 0.28)',
      accent: '#f472b6',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 4h18"/>
        <circle cx="12" cy="8.5" r="2"/>
        <path d="M7 4l2 7h6l2-7"/>
        <path d="M10 11v6l-1.5 4"/>
        <path d="M14 11v6l1.5 4"/>
      </svg>`,
    },
    plank: {
      gradient: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
      glow: 'rgba(129, 140, 248, 0.28)',
      accent: '#818cf8',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="19" cy="11" r="2"/>
        <path d="M3 16l12-3 2 3h3"/>
        <path d="M15 13v3"/>
        <path d="M2 19h20" opacity="0.45"/>
      </svg>`,
    },
    // 커스텀 운동 선택용 추가 아이콘들
    custom_flame: {
      gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
      glow: 'rgba(251, 146, 60, 0.28)',
      accent: '#fb923c',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4.5 2.5-6 1 1.5 2 2 2.5 1-.5-2.5 0-4.5 0-6z"/>
      </svg>`,
    },
    custom_swim: {
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
      glow: 'rgba(56, 189, 248, 0.28)',
      accent: '#38bdf8',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="16.5" cy="6.5" r="2"/>
        <path d="M5 13l5-3 4 2 3-2"/>
        <path d="M2 17c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0"/>
        <path d="M2 21c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0" opacity="0.5"/>
      </svg>`,
    },
    custom_bolt: {
      gradient: 'linear-gradient(135deg, #a3e635 0%, #65a30d 100%)',
      glow: 'rgba(163, 230, 53, 0.28)',
      accent: '#a3e635',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>`,
    },
    custom_heart: {
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
      glow: 'rgba(244, 63, 94, 0.28)',
      accent: '#f43f5e',
      svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12h4l2-5 4 10 2-5h6"/>
      </svg>`,
    },
  };

  /**
   * 운동 ID 또는 아이콘 키에 맞는 메타(그라데이션, SVG) 반환
   */
  function getExerciseVisual(exerciseId, fallbackIconKey = 'custom_flame') {
    if (fallbackIconKey && EXERCISE_SVGS[fallbackIconKey]) {
      return EXERCISE_SVGS[fallbackIconKey];
    }
    if (EXERCISE_SVGS[exerciseId]) {
      return EXERCISE_SVGS[exerciseId];
    }
    return EXERCISE_SVGS.custom_flame;
  }

  /**
   * 운동 아이콘 배지 HTML 생성
   */
  function renderExerciseBadge(exerciseId, iconKey, size = 'md') {
    const v = getExerciseVisual(exerciseId, iconKey);
    return `
      <span class="svg-ex-badge size-${size}" style="background: ${v.gradient}; box-shadow: 0 6px 14px ${v.glow};">
        ${v.svg}
      </span>
    `;
  }

  /**
   * 달력 셀 내부의 미니 도트/아이콘 렌더링
   */
  function renderCalendarMiniDot(exerciseId, iconKey) {
    const v = getExerciseVisual(exerciseId, iconKey);
    return `<span class="cal-mini-badge" style="background: ${v.gradient};">${v.svg}</span>`;
  }

  /**
   * 종목 추가/수정 모달에서 선택 가능한 벡터 아이콘 목록 (12종)
   */
  function getCustomSelectableIcons() {
    return [
      { key: 'custom_flame', label: '버닝' },
      { key: 'custom_bolt', label: '파워' },
      { key: 'custom_swim', label: '수영' },
      { key: 'custom_heart', label: '유산소' },
      { key: 'running', label: '달리기' },
      { key: 'squat', label: '스쿼트' },
      { key: 'cycling', label: '자전거' },
      { key: 'weight_training', label: '웨이트' },
      { key: 'pushup', label: '푸시업' },
      { key: 'walking', label: '산책' },
      { key: 'pullup', label: '턱걸이' },
      { key: 'plank', label: '코어' },
    ];
  }

  return {
    getExerciseVisual,
    renderExerciseBadge,
    renderCalendarMiniDot,
    getCustomSelectableIcons,
  };
})();
