/**
 * stats.js
 * 일별/주별/월별/종목별 운동 기록 통계 계산 모듈
 */

window.WorkoutStats = (function () {
  const {
    RECORD_TYPES,
    EXERCISE_CATEGORIES,
    DEFAULT_BALANCE_CATEGORIES,
    getCategoryMeta,
    resolveCategoryKey,
    formatDateKey,
    formatDuration,
  } = window.WorkoutModels;

  /**
   * 기간 필터('week' | 'month' | 'days30' | 'all')에 따른 시작일~종료일 계산
   */
  function getDateRangeForPeriod(period, baseDate = new Date()) {
    const end = formatDateKey(baseDate);
    if (period === 'all') {
      return { startDate: '0000-01-01', endDate: '9999-12-31', label: '전체 기간' };
    }

    if (period === 'week') {
      // 이번 주 월요일 ~ 일요일 기준
      const d = new Date(baseDate);
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        startDate: formatDateKey(monday),
        endDate: formatDateKey(sunday),
        label: '이번 주 (월~일)',
      };
    }

    if (period === 'month') {
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return {
        startDate: formatDateKey(firstDay),
        endDate: formatDateKey(lastDay),
        label: `${y}년 ${m + 1}월`,
      };
    }

    // 기본: 최근 30일
    const d30 = new Date(baseDate);
    d30.setDate(baseDate.getDate() - 29);
    return {
      startDate: formatDateKey(d30),
      endDate: end,
      label: '최근 30일',
    };
  }

  /**
   * 현재 연속 운동 일수(Streak) 계산
   */
  function calculateStreak(allLogs, todayDate = new Date()) {
    const activeDates = new Set(allLogs.map((l) => l.date));
    if (activeDates.size === 0) return 0;

    let streak = 0;
    const cursor = new Date(todayDate);
    const todayStr = formatDateKey(cursor);

    // 오늘 아직 기록이 없더라도 어제 기록이 있으면 어제부터 연속 일수 계산
    if (!activeDates.has(todayStr)) {
      cursor.setDate(cursor.getDate() - 1);
      if (!activeDates.has(formatDateKey(cursor))) {
        return 0;
      }
    }

    while (activeDates.has(formatDateKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  /**
   * 주어진 로그 목록에 대한 종합 통계 계산
   */
  function computeSummary(logs, allLogsForStreak = logs) {
    const uniqueDays = new Set();
    let totalSeconds = 0;
    let totalDistanceKm = 0;
    let totalSets = 0;
    let totalReps = 0;

    const byExerciseMap = {};

    logs.forEach((log) => {
      uniqueDays.add(log.date);

      if (!byExerciseMap[log.exerciseId]) {
        byExerciseMap[log.exerciseId] = {
          exerciseId: log.exerciseId,
          exerciseName: log.exerciseName,
          exerciseIcon: log.exerciseIcon || '🔥',
          recordType: log.recordType,
          count: 0,
          totalSeconds: 0,
          totalMinutes: 0,
          remainSeconds: 0,
          totalDistanceKm: 0,
          totalSets: 0,
          totalReps: 0,
          maxWeightKg: 0,
        };
      }

      const exStat = byExerciseMap[log.exerciseId];
      exStat.count += 1;

      if (log.recordType === RECORD_TYPES.TIME) {
        const mins = Number(log.minutes) || 0;
        const secs = Number(log.seconds) || 0;
        const logTotalSec = Math.round(mins * 60 + secs);
        const dist = Number(log.distanceKm) || 0;
        totalSeconds += logTotalSec;
        totalDistanceKm += dist;
        exStat.totalSeconds += logTotalSec;
        exStat.totalMinutes = Math.floor(exStat.totalSeconds / 60);
        exStat.remainSeconds = exStat.totalSeconds % 60;
        exStat.totalDistanceKm += dist;
      } else {
        const sets = Number(log.sets) || 0;
        const reps = Number(log.reps) || 0;
        const volumeReps = sets * reps;
        const weight = Number(log.weightKg) || 0;
        totalSets += sets;
        totalReps += volumeReps;
        exStat.totalSets += sets;
        exStat.totalReps += volumeReps;
        if (weight > exStat.maxWeightKg) {
          exStat.maxWeightKg = weight;
        }
      }
    });

    const exerciseBreakdown = Object.values(byExerciseMap).sort((a, b) => b.count - a.count);
    const maxCount = exerciseBreakdown.length > 0 ? exerciseBreakdown[0].count : 1;

    exerciseBreakdown.forEach((item) => {
      item.percentage = Math.round((item.count / Math.max(1, logs.length)) * 100);
      item.barWidth = Math.max(8, Math.round((item.count / maxCount) * 100));
    });

    return {
      activeDaysCount: uniqueDays.size,
      totalLogsCount: logs.length,
      totalSeconds,
      totalMinutes: Math.floor(totalSeconds / 60),
      remainSeconds: totalSeconds % 60,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      totalSets,
      totalReps,
      streakDays: calculateStreak(allLogsForStreak),
      exerciseBreakdown,
    };
  }

  /**
   * 로그 배열에서 시간(분·초), 세트 수, 활동 점수 합산 헬퍼
   */
  function aggregateBucketMetrics(bucketLogs) {
    let totalSeconds = 0;
    let sets = 0;
    bucketLogs.forEach((l) => {
      if (l.recordType === RECORD_TYPES.TIME) {
        totalSeconds += Math.round((Number(l.minutes) || 0) * 60 + (Number(l.seconds) || 0));
      } else {
        sets += Number(l.sets) || 0;
      }
    });
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const activityScore = totalSeconds / 600 + sets;
    return {
      count: bucketLogs.length,
      totalSeconds,
      minutes,
      seconds,
      sets,
      activityScore,
    };
  }

  /**
   * 선택된 기간('week' | 'month' | 'days30' | 'all')에 맞춘 운동량 추이 그래프 데이터 생성
   */
  function getPeriodTrend(allLogs, period = 'month', baseDate = new Date()) {
    const todayStr = formatDateKey(baseDate);
    let chartTitle = '📈 기간별 운동량 추이';
    let buckets = [];

    if (period === 'week') {
      chartTitle = '📈 이번 주 요일별 운동량 (월~일)';
      const daysKor = ['일', '월', '화', '수', '목', '금', '토'];
      const d = new Date(baseDate);
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);

      for (let i = 0; i < 7; i++) {
        const cur = new Date(monday);
        cur.setDate(monday.getDate() + i);
        const dateStr = formatDateKey(cur);
        const dayLogs = allLogs.filter((l) => l.date === dateStr);
        const metrics = aggregateBucketMetrics(dayLogs);
        buckets.push({
          label: daysKor[cur.getDay()],
          subLabel: `${cur.getMonth() + 1}/${cur.getDate()}`,
          isCurrent: dateStr === todayStr,
          ...metrics,
        });
      }
    } else if (period === 'month') {
      const y = baseDate.getFullYear();
      const m = baseDate.getMonth();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      chartTitle = `📈 ${m + 1}월 주차별 운동량`;

      const ranges = [
        { label: '1주차', start: 1, end: 7 },
        { label: '2주차', start: 8, end: 14 },
        { label: '3주차', start: 15, end: 21 },
        { label: '4주차', start: 22, end: 28 },
      ];
      if (daysInMonth >= 29) {
        ranges.push({ label: '5주차', start: 29, end: daysInMonth });
      }

      const todayDay = baseDate.getDate();
      ranges.forEach((r) => {
        const sDate = formatDateKey(new Date(y, m, r.start));
        const eDate = formatDateKey(new Date(y, m, r.end));
        const rangeLogs = allLogs.filter((l) => l.date >= sDate && l.date <= eDate);
        const metrics = aggregateBucketMetrics(rangeLogs);
        buckets.push({
          label: r.label,
          subLabel: `${r.start}~${r.end}일`,
          isCurrent: todayDay >= r.start && todayDay <= r.end,
          ...metrics,
        });
      });
    } else if (period === 'days30') {
      chartTitle = '📈 최근 30일 구간별 운동량 (5일 단위)';
      // 최근 30일을 5일씩 6개 구간으로 표시
      for (let b = 5; b >= 0; b--) {
        const endOffset = b * 5;
        const startOffset = endOffset + 4;

        const sObj = new Date(baseDate);
        sObj.setDate(baseDate.getDate() - startOffset);
        const eObj = new Date(baseDate);
        eObj.setDate(baseDate.getDate() - endOffset);

        const sDate = formatDateKey(sObj);
        const eDate = formatDateKey(eObj);
        const rangeLogs = allLogs.filter((l) => l.date >= sDate && l.date <= eDate);
        const metrics = aggregateBucketMetrics(rangeLogs);

        buckets.push({
          label: b === 0 ? '최근5일' : `${sObj.getMonth() + 1}/${sObj.getDate()}~`,
          subLabel: `${sObj.getDate()}~${eObj.getDate()}일`,
          isCurrent: b === 0,
          ...metrics,
        });
      }
    } else {
      // 'all' 전체 기간 -> 최근 6개월 월별 추이
      chartTitle = '📈 최근 6개월 월별 운동량 추이';
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
        const y = mDate.getFullYear();
        const m = mDate.getMonth();
        const firstDay = formatDateKey(new Date(y, m, 1));
        const lastDay = formatDateKey(new Date(y, m + 1, 0));

        const monthLogs = allLogs.filter((l) => l.date >= firstDay && l.date <= lastDay);
        const metrics = aggregateBucketMetrics(monthLogs);

        buckets.push({
          label: `${m + 1}월`,
          subLabel: `${y}`,
          isCurrent: i === 0,
          ...metrics,
        });
      }
    }

    const maxScore = Math.max(1, ...buckets.map((r) => r.activityScore));
    buckets.forEach((r) => {
      r.heightPercent =
        r.count === 0 ? 6 : Math.max(18, Math.round((r.activityScore / maxScore) * 100));
    });

    return {
      chartTitle,
      buckets,
    };
  }

  /**
   * 사용자가 선택한 운동 카테고리(3~8개)별 성취도(0~100%) 레이더 차트 데이터 계산
   */
  function computeCategoryBalance(
    logs,
    allExercises = [],
    period = 'month',
    selectedCategoryKeys = null
  ) {
    const validSet = new Set(EXERCISE_CATEGORIES.map((c) => c.key));
    const keysToUse =
      Array.isArray(selectedCategoryKeys) && selectedCategoryKeys.length >= 3
        ? selectedCategoryKeys.filter((k) => validSet.has(k))
        : DEFAULT_BALANCE_CATEGORIES;

    const activeCategories = keysToUse.map((k) => getCategoryMeta(k));
    const categoryMap = {};
    activeCategories.forEach((cat) => {
      categoryMap[cat.key] = {
        key: cat.key,
        label: cat.label,
        shortLabel: cat.shortLabel,
        icon: cat.icon,
        color: cat.color,
        count: 0,
        totalSeconds: 0,
        totalSets: 0,
        points: 0,
      };
    });

    logs.forEach((log) => {
      const catKey = resolveCategoryKey(log, allExercises);
      const bucket = categoryMap[catKey];
      if (!bucket) return; // 사용자가 그래프에서 제외한 카테고리는 차트 집계 생략
      bucket.count += 1;

      if (log.recordType === RECORD_TYPES.TIME) {
        const sec = Math.round((Number(log.minutes) || 0) * 60 + (Number(log.seconds) || 0));
        bucket.totalSeconds += sec;
        bucket.points += sec / 60; // 1분 = 1점
      } else {
        const sets = Number(log.sets) || 0;
        bucket.totalSets += sets;
        bucket.points += sets * 5; // 1세트 = 5점 (12세트 = 60점)
      }
    });

    let targetPoints = 240;
    let goalLabel = '월간 기준: 240분 또는 48세트 = 100%';

    if (period === 'week') {
      targetPoints = 60;
      goalLabel = '주간 기준: 60분 또는 12세트 = 100%';
    } else if (period === 'month') {
      targetPoints = 240;
      goalLabel = '월간 기준: 240분 또는 48세트 = 100%';
    } else if (period === 'days30') {
      targetPoints = 240;
      goalLabel = '30일 기준: 240분 또는 48세트 = 100%';
    } else {
      // 전체 기간: 선택된 카테고리 중 가장 많이 수행한 영역(최소 60점 이상)을 100% 기준선으로 비교
      const maxPoints = Math.max(0, ...Object.values(categoryMap).map((c) => c.points));
      targetPoints = Math.max(60, maxPoints);
      goalLabel = '전체 기간: 최다 수행 영역(100%) 대비 균형';
    }

    const items = activeCategories.map((cat) => {
      const b = categoryMap[cat.key];
      const rawPercent = Math.round((b.points / Math.max(1, targetPoints)) * 100);
      const percent = Math.min(100, Math.max(0, rawPercent));
      const plotPercent = percent;

      let metricText = '기록 없음';
      if (b.count > 0) {
        const parts = [];
        if (b.totalSeconds > 0) {
          parts.push(formatDuration(Math.floor(b.totalSeconds / 60), b.totalSeconds % 60));
        }
        if (b.totalSets > 0) {
          parts.push(`${b.totalSets}세트`);
        }
        metricText = parts.join(' + ') || `${b.count}건`;
      }

      return {
        ...b,
        targetPoints,
        percent,
        plotPercent,
        metricText,
      };
    });

    const averagePercent = Math.round(
      items.reduce((acc, cur) => acc + cur.percent, 0) / Math.max(1, items.length)
    );

    return {
      items,
      goalLabel,
      averagePercent,
    };
  }

  return {
    getDateRangeForPeriod,
    calculateStreak,
    computeSummary,
    getPeriodTrend,
    computeCategoryBalance,
  };
})();
