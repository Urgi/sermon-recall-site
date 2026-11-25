import { type AppLanguage, normalizeAppLanguage } from './languages';
import { getActiveUiLanguage, translateUi } from './ui';

/**
 * The API routes answer in English. This maps the messages a pastor can actually see to Spanish and
 * French on the client. Anything unmapped falls back to a short generic message in the user's language.
 */
type Row = readonly [en: string, es: string, fr: string];

const N = ' ';

const EXACT: readonly Row[] = [
  ['Unauthorized.', 'Tu sesión no es válida. Inicia sesión de nuevo.', 'Votre session n’est plus valide. Reconnectez-vous.'],
  ['Sign in required.', 'Debes iniciar sesión.', 'Vous devez vous connecter.'],
  ['Sign in to accept this invite.', 'Inicia sesión para aceptar esta invitación.', 'Connectez-vous pour accepter cette invitation.'],
  ['Forbidden.', 'No tienes permiso para hacer esto.', 'Vous n’avez pas l’autorisation d’effectuer cette action.'],
  ['You must belong to a church.', 'Debes pertenecer a una iglesia.', 'Vous devez appartenir à une église.'],
  ['No church.', 'Debes pertenecer a una iglesia.', 'Vous devez appartenir à une église.'],
  ['Church not found.', 'No se encontró la iglesia.', 'Église introuvable.'],
  ['Sermon not found.', 'No se encontró el sermón.', 'Prédication introuvable.'],
  ['Not found.', 'No se encontró.', 'Introuvable.'],
  ['Job not found.', 'No se encontró el trabajo.', 'Tâche introuvable.'],
  ['This sermon belongs to another church.', 'Este sermón pertenece a otra iglesia.', 'Cette prédication appartient à une autre église.'],
  ['Too many attempts. Try again shortly.', 'Demasiados intentos. Inténtalo de nuevo en un momento.', 'Trop de tentatives. Réessayez dans un instant.'],
  ['Too many lookups. Try again shortly.', 'Demasiadas consultas. Inténtalo de nuevo en un momento.', 'Trop de requêtes. Réessayez dans un instant.'],
  ['Too many sends. Try again later.', 'Demasiados envíos. Inténtalo más tarde.', 'Trop d’envois. Réessayez plus tard.'],
  ['Too many emails sent today. Try again tomorrow.', 'Se enviaron demasiados correos hoy. Inténtalo mañana.', 'Trop d’e-mails ont été envoyés aujourd’hui. Réessayez demain.'],
  ['Rate limit reached.', 'Se alcanzó el límite de uso. Inténtalo más tarde.', 'Limite d’utilisation atteinte. Réessayez plus tard.'],
  ['Generation rate limit reached. Try again later.', 'Se alcanzó el límite de generaciones. Inténtalo más tarde.', 'Limite de générations atteinte. Réessayez plus tard.'],
  ['Transcription rate limit reached.', 'Se alcanzó el límite de transcripciones. Inténtalo más tarde.', 'Limite de transcriptions atteinte. Réessayez plus tard.'],
  ['Billing is not configured yet.', 'La facturación aún no está configurada.', 'La facturation n’est pas encore configurée.'],
  ['Billing not configured.', 'La facturación aún no está configurada.', 'La facturation n’est pas encore configurée.'],
  ['Unknown plan.', 'Plan desconocido.', 'Forfait inconnu.'],
  ['Could not start checkout.', 'No se pudo iniciar el pago.', 'Impossible de démarrer le paiement.'],
  ['Could not open billing portal.', 'No se pudo abrir el portal de facturación.', 'Impossible d’ouvrir le portail de facturation.'],
  ['Could not change your plan.', 'No se pudo cambiar tu plan.', 'Impossible de changer votre forfait.'],
  ['Could not check your member count.', 'No se pudo comprobar tu número de miembros.', 'Impossible de vérifier votre nombre de membres.'],
  ['No active subscription. Subscribe first.', 'No hay una suscripción activa. Suscríbete primero.', 'Aucun abonnement actif. Abonnez-vous d’abord.'],
  ['No billing account yet. Subscribe first.', 'Aún no hay una cuenta de facturación. Suscríbete primero.', 'Aucun compte de facturation pour le moment. Abonnez-vous d’abord.'],
  ['Your church already has a subscription. Use Manage billing to change plans.', 'Tu iglesia ya tiene una suscripción. Usa «Gestionar facturación» para cambiar de plan.', `Votre église a déjà un abonnement. Utilisez «${N}Gérer la facturation${N}» pour changer de forfait.`],
  ['Enter a valid email address.', 'Escribe un correo electrónico válido.', 'Saisissez une adresse e-mail valide.'],
  ['Valid email required.', 'Escribe un correo electrónico válido.', 'Saisissez une adresse e-mail valide.'],
  ['email required', 'Escribe un correo electrónico.', 'Saisissez une adresse e-mail.'],
  ['Enter a church name.', 'Escribe el nombre de la iglesia.', 'Saisissez le nom de l’église.'],
  ['Church name is required.', 'Escribe el nombre de la iglesia.', 'Saisissez le nom de l’église.'],
  ['Church code must be 4–32 characters.', 'El código de la iglesia debe tener entre 4 y 32 caracteres.', 'Le code de l’église doit comporter entre 4 et 32 caractères.'],
  ['That church code is already taken.', 'Ese código de iglesia ya está en uso.', 'Ce code d’église est déjà utilisé.'],
  ['Choose English, Spanish, or French.', 'Elige inglés, español o francés.', 'Choisissez l’anglais, l’espagnol ou le français.'],
  ['You cannot change church settings.', 'No puedes cambiar los ajustes de la iglesia.', 'Vous ne pouvez pas modifier les paramètres de l’église.'],
  ['Invite is invalid or expired.', 'La invitación no es válida o caducó.', 'L’invitation n’est pas valide ou a expiré.'],
  ['This invite was sent to a different email address.', 'Esta invitación se envió a otro correo electrónico.', 'Cette invitation a été envoyée à une autre adresse e-mail.'],
  ['That person is already in your church.', 'Esa persona ya está en tu iglesia.', 'Cette personne fait déjà partie de votre église.'],
  ['You cannot invite yourself.', 'No puedes invitarte a ti mismo.', 'Vous ne pouvez pas vous inviter vous-même.'],
  ['You cannot assign that role.', 'No puedes asignar ese rol.', 'Vous ne pouvez pas attribuer ce rôle.'],
  ['You cannot assign or modify that role.', 'No puedes asignar ni modificar ese rol.', 'Vous ne pouvez pas attribuer ni modifier ce rôle.'],
  ['Invalid role.', 'Rol no válido.', 'Rôle non valide.'],
  ['You cannot change your own role.', 'No puedes cambiar tu propio rol.', 'Vous ne pouvez pas modifier votre propre rôle.'],
  ['The owner role cannot be changed here.', 'El rol de propietario no se puede cambiar aquí.', 'Le rôle de propriétaire ne peut pas être modifié ici.'],
  ['Cannot remove the church owner.', 'No se puede quitar al propietario de la iglesia.', 'Impossible de retirer le propriétaire de l’église.'],
  ['You cannot remove yourself.', 'No puedes quitarte a ti mismo.', 'Vous ne pouvez pas vous retirer vous-même.'],
  ['Use account settings to leave the church.', 'Usa los ajustes de la cuenta para salir de la iglesia.', 'Utilisez les paramètres du compte pour quitter l’église.'],
  ['You cannot remove a member with equal or higher access.', 'No puedes quitar a un miembro con el mismo acceso o mayor que el tuyo.', 'Vous ne pouvez pas retirer un membre ayant un accès égal ou supérieur au vôtre.'],
  ['You do not have permission to view the team.', 'No tienes permiso para ver el equipo.', 'Vous n’avez pas l’autorisation de consulter l’équipe.'],
  ['Only the church owner or admin pastor can remove members.', 'Solo el propietario de la iglesia o el pastor administrador puede quitar miembros.', 'Seuls le propriétaire de l’église ou le pasteur administrateur peuvent retirer des membres.'],
  ['This person is on your Team. Remove them from the Team page.', 'Esta persona está en tu Equipo. Quítala desde la página Equipo.', 'Cette personne fait partie de votre équipe. Retirez-la depuis la page Équipe.'],
  ['That member is not in your church.', 'Ese miembro no está en tu iglesia.', 'Ce membre ne fait pas partie de votre église.'],
  ['Member not found.', 'No se encontró al miembro.', 'Membre introuvable.'],
  ['Could not remove member.', 'No se pudo quitar al miembro.', 'Impossible de retirer le membre.'],
  ['Could not create account. Try again in a minute.', 'No se pudo crear la cuenta. Inténtalo de nuevo en un minuto.', 'Impossible de créer le compte. Réessayez dans une minute.'],
  ['Enter your account email to confirm deletion.', 'Escribe el correo de tu cuenta para confirmar la eliminación.', 'Saisissez l’adresse e-mail de votre compte pour confirmer la suppression.'],
  ['You must confirm that the church and member access will be removed.', 'Debes confirmar que se eliminarán la iglesia y el acceso de los miembros.', 'Vous devez confirmer que l’église et l’accès des membres seront supprimés.'],
  ['Add sermon script or notes before generating devotionals.', 'Añade el texto o las notas del sermón antes de generar los devocionales.', 'Ajoutez le texte ou les notes de la prédication avant de générer les dévotions.'],
  ['Text file was empty.', 'El archivo de texto estaba vacío.', 'Le fichier texte était vide.'],
  ['File is too large (max 50 MB).', 'El archivo es demasiado grande (máximo 50 MB).', 'Le fichier est trop volumineux (50 Mo maximum).'],
  ['Enter a valid YouTube URL.', 'Escribe una URL de YouTube válida.', 'Saisissez une URL YouTube valide.'],
  ['Could not load video details.', 'No se pudieron cargar los datos del video.', 'Impossible de charger les détails de la vidéo.'],
  ['This sermon already has devotionals. Pass replace: true to replace them.', 'Este sermón ya tiene devocionales.', 'Cette prédication a déjà des dévotions.'],
  ['Devotionals already exist. Use replace: true to resubmit.', 'Los devocionales ya existen.', 'Les dévotions existent déjà.'],
  ['Sermon is not awaiting approval.', 'El sermón no está pendiente de aprobación.', 'La prédication n’est pas en attente d’approbation.'],
  ['Select at least one team role or include all members.', 'Selecciona al menos un rol del equipo o incluye a todos los miembros.', 'Sélectionnez au moins un rôle de l’équipe ou incluez tous les membres.'],
  ['Cannot schedule more than 90 days ahead.', 'No se puede programar con más de 90 días de antelación.', 'Impossible de programmer plus de 90 jours à l’avance.'],
  ['Schedule at least 2 minutes in the future.', 'Programa el envío con al menos 2 minutos de antelación.', 'Programmez l’envoi au moins 2 minutes à l’avance.'],
  ['sendAt must be a valid date.', 'Elige una fecha y hora válidas.', 'Choisissez une date et une heure valides.'],
  ['sendAt is required (ISO-8601).', 'Elige una fecha y hora.', 'Choisissez une date et une heure.'],
  ['title and body are required.', 'Escribe un título y un mensaje.', 'Saisissez un titre et un message.'],
  ['Handler failed.', 'Algo salió mal. Inténtalo de nuevo.', 'Une erreur s’est produite. Réessayez.'],
  ['Temporary error.', 'Error temporal. Inténtalo de nuevo.', 'Erreur temporaire. Réessayez.'],
  ['History is not configured (missing service role).', 'El historial no está disponible por ahora.', 'L’historique n’est pas disponible pour le moment.'],
  ['Push delivery is not configured (missing service role).', 'El envío de notificaciones no está disponible por ahora.', 'L’envoi de notifications n’est pas disponible pour le moment.'],
];

const PATTERNS: readonly (readonly [RegExp, (m: RegExpMatchArray, lang: AppLanguage) => string])[] = [
  [/^Invite limit reached\. Try again in (\d+)s\.$/, (m, l) => (l === 'es' ? `Límite de invitaciones alcanzado. Inténtalo de nuevo en ${m[1]} s.` : `Limite d’invitations atteinte. Réessayez dans ${m[1]}${N}s.`)],
  [/^Limit of (\d+) notifications per 24 hours reached\.$/, (m, l) => (l === 'es' ? `Se alcanzó el límite de ${m[1]} notificaciones cada 24 horas.` : `Limite de ${m[1]} notifications par 24${N}heures atteinte.`)],
  [/^Too many pending scheduled messages \(max (\d+)\)\.$/, (m, l) => (l === 'es' ? `Hay demasiados mensajes programados pendientes (máximo ${m[1]}).` : `Trop de messages programmés en attente (${m[1]} au maximum).`)],
  [/^You are already on (.+)\.$/, (m, l) => (l === 'es' ? `Ya estás en el plan ${m[1]}.` : `Vous êtes déjà sur le forfait ${m[1]}.`)],
  [/^Your church has (\d+) members; (.+) allows (\d+)\. Remove members first\.$/, (m, l) =>
    l === 'es'
      ? `Tu iglesia tiene ${m[1]} miembros; el plan ${m[2]} permite ${m[3]}. Quita miembros primero.`
      : `Votre église compte ${m[1]} membres ; le forfait ${m[2]} en autorise ${m[3]}. Retirez d’abord des membres.`],
  [/^Cannot submit from status "(.+)"\.$/, (_m, l) => (l === 'es' ? 'No se puede enviar en el estado actual.' : 'Envoi impossible dans l’état actuel.')],
];

/** Translate an API error message for display. English passes through; unmapped text becomes a generic line. */
export function localizeApiError(message: string | null | undefined, language?: unknown): string {
  const target = language === undefined ? getActiveUiLanguage() : normalizeAppLanguage(language);
  const text = (message ?? '').trim();
  if (target === 'en') return text || translateUi('en', 'common.error');
  if (!text) return translateUi(target, 'common.error');
  const exact = EXACT.find((r) => r[0] === text);
  if (exact) return target === 'es' ? exact[1] : exact[2];
  for (const [re, fn] of PATTERNS) {
    const m = text.match(re);
    if (m) return fn(m, target);
  }
  return translateUi(target, 'common.error');
}

/** Appends the server's English hint only when the UI is English (hints are not translated). */
export function withApiHint(message: string, hint?: string | null): string {
  return hint && getActiveUiLanguage() === 'en' ? `${message} ${hint}` : message;
}
