import { type AppLanguage, normalizeAppLanguage } from './languages';

type PushPair = { title: string; body: string };

function short(title: string, max = 80): string {
  return title.length > max ? `${title.slice(0, max - 3)}…` : title;
}

export function reminderPushCopy(
  language: unknown,
  kind: 'custom' | 'morning' | 'midday',
  opts: { missedEarlier: boolean; cycleDay: number; sermonTitle: string },
): PushPair {
  const lang = normalizeAppLanguage(language);
  const sermon = short(opts.sermonTitle);
  const day = opts.cycleDay;

  if (lang === 'es') {
    if (kind === 'midday') {
      return {
        title: opts.missedEarlier ? 'Gracia para tu ritmo' : 'Aún hay tiempo hoy',
        body: opts.missedEarlier
          ? `Sin prisa — termina el día ${day} (o uno anterior) cuando puedas — ${sermon}`
          : `Termina el día ${day} cuando puedas — ${sermon}`,
      };
    }
    return {
      title:
        kind === 'morning' && opts.missedEarlier
          ? 'Retoma donde lo dejaste'
          : opts.missedEarlier
            ? 'Aún puedes ponerte al día'
            : 'Tu devocional de hoy',
      body: opts.missedEarlier
        ? kind === 'morning'
          ? `Todavía puedes abrir los días 1–${day} — ${sermon}`
          : `Los días 1–${day} están abiertos cuando quieras — ${sermon}`
        : `Día ${day} de 6 — ${sermon}`,
    };
  }

  if (lang === 'fr') {
    if (kind === 'midday') {
      return {
        title: opts.missedEarlier ? 'De la grâce pour votre rythme' : 'Il est encore temps',
        body: opts.missedEarlier
          ? `Pas de précipitation — terminez le jour ${day} (ou un jour précédent) quand vous pouvez — ${sermon}`
          : `Terminez le jour ${day} quand vous pouvez — ${sermon}`,
      };
    }
    return {
      title:
        kind === 'morning' && opts.missedEarlier
          ? 'Reprenez où vous en étiez'
          : opts.missedEarlier
            ? 'Il est encore temps de rattraper'
            : 'Votre dévotion du jour',
      body: opts.missedEarlier
        ? kind === 'morning'
          ? `Les jours 1–${day} sont encore ouverts — ${sermon}`
          : `Les jours 1–${day} sont ouverts quand vous êtes prêt — ${sermon}`
        : `Jour ${day} sur 6 — ${sermon}`,
    };
  }

  if (kind === 'midday') {
    return {
      title: opts.missedEarlier ? 'Grace for your rhythm' : 'Still time today',
      body: opts.missedEarlier
        ? `No rush — finish Day ${day} (or any earlier day) when you can — ${sermon}`
        : `Finish Day ${day} when you can — ${sermon}`,
    };
  }
  return {
    title:
      kind === 'morning' && opts.missedEarlier
        ? 'Pick up where you left off'
        : opts.missedEarlier
          ? 'Still time to catch up'
          : 'Your devotional today',
    body: opts.missedEarlier
      ? kind === 'morning'
        ? `You can still open Days 1–${day} — ${sermon}`
        : `Days 1–${day} are open when you are ready — ${sermon}`
      : `Day ${day} of 6 — ${sermon}`,
  };
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

export function midweekBehindPushCopy(
  language: unknown,
  opts: { expected: number; sermonTitle: string },
): PushPair {
  const lang = normalizeAppLanguage(language);
  const sermon = short(opts.sermonTitle);
  if (lang === 'es') {
    return {
      title: 'Un poco atrasado sigue en el camino',
      body: `Llevas más de un día de retraso esta semana. Los días 1–${opts.expected} están abiertos — retoma el siguiente cuando puedas. ${sermon}`,
    };
  }
  if (lang === 'fr') {
    return {
      title: 'Un peu de retard, toujours sur le chemin',
      body: `Vous avez plus d’un jour de retard cette semaine. Les jours 1–${opts.expected} sont ouverts — reprenez le suivant quand vous pouvez. ${sermon}`,
    };
  }
  return {
    title: 'A little behind is still on the path',
    body: `You’re more than a day behind this week. Days 1–${opts.expected} are open — pick up the next one when you can. ${sermon}`,
  };
}
