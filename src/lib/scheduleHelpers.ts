import { DayOfWeek, ScheduleDaySlot, TherapySession } from '../types';

export const OPERATIONAL_DAYS: { day: DayOfWeek; open: string; close: string; allowed: boolean }[] = [
  { day: 'Senin', open: '13:00', close: '17:00', allowed: true },
  { day: 'Selasa', open: '13:00', close: '17:00', allowed: true },
  { day: 'Rabu', open: '13:00', close: '17:00', allowed: true },
  { day: 'Kamis', open: '13:00', close: '16:00', allowed: true }, // Tutup jam 16:00!
  { day: 'Jumat', open: '00:00', close: '00:00', allowed: false }, // Libur
  { day: 'Sabtu', open: '13:00', close: '17:00', allowed: true },
  { day: 'Minggu', open: '13:00', close: '17:00', allowed: true },
];

export const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

export const DAY_TO_INDEX: Record<DayOfWeek, number> = {
  Minggu: 0,
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
};

/**
 * Mengembalikan daftar jam mulai yang valid untuk hari dan durasi tertentu.
 * Kamis tutup jam 16.00 sehingga paket 2 jam maksimal mulai jam 14.00.
 */
export function getAvailableStartTimes(day: DayOfWeek, durationHours: 1 | 2): string[] {
  if (day === 'Jumat') return [];

  if (day === 'Kamis') {
    // Tutup jam 16:00
    if (durationHours === 1) {
      return ['13:00', '14:00', '15:00'];
    } else {
      // 2 jam berturut-turut sebelum tutup (16:00)
      return ['13:00', '14:00'];
    }
  }

  // Senin, Selasa, Rabu, Sabtu, Minggu (Tutup jam 17:00)
  if (durationHours === 1) {
    return ['13:00', '14:00', '15:00', '16:00'];
  } else {
    // 2 jam berturut-turut sebelum tutup (17:00)
    return ['13:00', '14:00', '15:00'];
  }
}

/**
 * Menghitung jam selesai berdasarkan jam mulai dan durasi
 */
export function calculateEndTime(startTime: string, durationHours: number): string {
  const [hourStr, minStr] = startTime.split(':');
  const startHour = parseInt(hourStr, 10);
  const endHour = startHour + durationHours;
  return `${endHour.toString().padStart(2, '0')}:${minStr || '00'}`;
}

/**
 * Menghasilkan seluruh tanggal sesi dalam sebulan berdasarkan pilihan konfigurasi hari & jam
 */
export function generateSessionsForMonth(params: {
  scheduleId: string;
  studentId: string;
  teacherId: string;
  monthYear: string; // e.g. "2026-11"
  daysConfig: ScheduleDaySlot[];
}): Omit<TherapySession, 'id'>[] {
  const { scheduleId, studentId, teacherId, monthYear, daysConfig } = params;
  const [yearStr, monthStr] = monthYear.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed in JS Date

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const sessions: Omit<TherapySession, 'id'>[] = [];

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    const date = new Date(year, month, dayNumber);
    const dayOfWeek = DAY_INDEX_MAP[date.getDay()];

    const configForDay = daysConfig.find((cfg) => cfg.day === dayOfWeek);
    if (configForDay) {
      const sessionDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      const endTime = calculateEndTime(configForDay.startTime, configForDay.duration);

      sessions.push({
        scheduleId,
        studentId,
        teacherId,
        sessionDate,
        dayName: dayOfWeek,
        startTime: configForDay.startTime,
        endTime,
        durationHours: configForDay.duration,
        attendanceStatus: 'Belum',
      });
    }
  }

  return sessions;
}

/**
 * Cek apakah jadwal bentrok untuk guru yang sama pada waktu yang sama
 */
export function checkScheduleClash(
  existingSessions: TherapySession[],
  newSession: { teacherId: string; sessionDate: string; startTime: string; endTime: string; excludeSessionId?: string }
): boolean {
  return existingSessions.some((s) => {
    if (newSession.excludeSessionId && s.id === newSession.excludeSessionId) return false;
    if (s.teacherId !== newSession.teacherId) return false;
    if (s.sessionDate !== newSession.sessionDate) return false;

    // Cek irisan waktu (overlap)
    return s.startTime < newSession.endTime && s.endTime > newSession.startTime;
  });
}
