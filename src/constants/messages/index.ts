import { MESSAGES_EN } from './en.js';
import { MESSAGES_FR } from './fr.js';

export type Language = 'en' | 'fr';
export type MessageCategory = keyof typeof MESSAGES_EN;

export { MESSAGES_EN, MESSAGES_FR };

/**
 * Get messages for a specific language
 */
export function getMessages(lang: Language = 'en') {
    return lang === 'fr' ? MESSAGES_FR : MESSAGES_EN;
}
