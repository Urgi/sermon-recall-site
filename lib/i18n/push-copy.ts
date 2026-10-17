import { type AppLanguage, normalizeAppLanguage } from './languages';

type PushPair = { title: string; body: string };

function short(title: string, max = 80): string {
  return title.length > max ? `${title.slice(0, max - 3)}…` : title;
}

/** Pick a variant by calendar day so a member who stays behind never sees the same title twice in a row. */
function rotate(calendarDay: number, variants: string[]): string {
  return variants[calendarDay % variants.length];
}

export type ReminderCopyKind = 'today' | 'behind' | 'catchup1' | 'catchup2';

/**
 * Daily devotional reminder copy. It follows the calendar so no two days read the same:
 * - today:    on pace — names today's topic.
 * - behind:   names the next unfinished day and which calendar day opened today.
 * - catchup1: first nudge after the sermon week ends.
 * - catchup2: last nudge; says we'll go quiet until the next sermon.
 */
export function reminderPushCopy(
  language: unknown,
  kind: ReminderCopyKind,
  opts: {
    sermonTitle: string;
    targetDay: number;
    calendarDay: number;
    topic: string | null;
    remaining: number;
  },
): PushPair {
  const lang = normalizeAppLanguage(language);
  const sermon = short(opts.sermonTitle, 60);
  const d = opts.targetDay;
  const topic = opts.topic ? short(opts.topic, 60) : null;
  const n = opts.remaining;

  if (lang === 'es') {
    const dayLabel = topic ? `Día ${d}: ${topic}` : `Día ${d}`;
    switch (kind) {
      case 'today':
        return { title: dayLabel, body: `La lectura de hoy de “${sermon}”.` };
      case 'behind':
        return {
          title: rotate(opts.calendarDay, [
            `Retoma con el día ${d}`,
            `El día ${d} te espera`,
            `¿Unos minutos para el día ${d}?`,
          ]),
          body: `${topic ? `“${topic}” es el siguiente. ` : ''}Hoy se abrió el día ${opts.calendarDay} — sin prisa, a tu ritmo.`,
        };
      case 'catchup1':
        return {
          title: `Aún hay tiempo para “${sermon}”`,
          body: `Los seis días están abiertos. Continúa con el día ${d}${topic ? `: ${topic}` : ''}.`,
        };
      case 'catchup2':
        return {
          title: 'Un último recordatorio',
          body: `${n === 1 ? 'Te queda 1 día' : `Te quedan ${n} días`} de “${sermon}” cuando quieras. No te avisaremos más hasta el próximo sermón.`,
        };
    }
  }

  if (lang === 'fr') {
    const dayLabel = topic ? `Jour ${d} : ${topic}` : `Jour ${d}`;
    switch (kind) {
      case 'today':
        return { title: dayLabel, body: `La lecture du jour de « ${sermon} ».` };
      case 'behind':
        return {
          title: rotate(opts.calendarDay, [
            `Reprenez au jour ${d}`,
            `Le jour ${d} vous attend`,
            `Quelques minutes pour le jour ${d} ?`,
          ]),
          body: `${topic ? `« ${topic} » est le suivant. ` : ''}Le jour ${opts.calendarDay} s’est ouvert aujourd’hui — sans pression, à votre rythme.`,
        };
      case 'catchup1':
        return {
          title: `Encore temps pour « ${sermon} »`,
          body: `Les six jours sont ouverts. Reprenez au jour ${d}${topic ? ` : ${topic}` : ''}.`,
        };
      case 'catchup2':
        return {
          title: 'Un dernier rappel',
          body: `${n === 1 ? 'Il vous reste 1 jour' : `Il vous reste ${n} jours`} de « ${sermon} » quand vous voulez. Nous ne vous relancerons plus avant la prochaine prédication.`,
        };
    }
  }

  const dayLabel = topic ? `Day ${d}: ${topic}` : `Day ${d}`;
  switch (kind) {
    case 'today':
      return { title: dayLabel, body: `Today’s reading from “${sermon}”.` };
    case 'behind':
      return {
        title: rotate(opts.calendarDay, [
          `Pick up with Day ${d}`,
          `Day ${d} is still waiting`,
          `A few quiet minutes for Day ${d}?`,
        ]),
        body: `${topic ? `“${topic}” is next. ` : ''}Day ${opts.calendarDay} opened today — no rush, go at your pace.`,
      };
    case 'catchup1':
      return {
        title: `Still time for “${sermon}”`,
        body: `All six days are open. Pick up with ${dayLabel}.`,
      };
    case 'catchup2':
      return {
        title: 'One last nudge',
        body: `${n === 1 ? '1 day' : `${n} days`} of “${sermon}” ${n === 1 ? 'is' : 'are'} waiting whenever you’re ready. We’ll stay quiet until the next sermon.`,
      };
  }
}

export function newWeekPushCopy(language: unknown, sermonTitle: string): PushPair {
  const lang = normalizeAppLanguage(language);
  const sermon = short(sermonTitle, 100);
  if (lang === 'es') {
    return { title: 'El día 1 está listo', body: `Empieza el recorrido de esta semana — ${sermon}` };
  }
  if (lang === 'fr') {
    return { title: 'Le jour 1 est prêt', body: `Commencez le parcours de cette semaine — ${sermon}` };
  }
  return { title: 'Day 1 is ready', body: `Start this week’s journey — ${sermon}` };
}
