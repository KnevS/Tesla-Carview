/**
 * Generiert datenschutz-freundliche Pseudonyme fuer Mandanten.
 *
 * Hintergrund: die Login-Seite listet alle Mandanten, damit der User
 * waehlen kann, in welchen er sich einloggen will. Mit Klarnamen
 * ('Acme GmbH', 'Familie Mueller') wuerde damit nach aussen sichtbar,
 * welche Firmen / Personen den Self-Hoster nutzen — DSGVO-relevant
 * und schlicht unnoetige Information fuer einen Login-Auswahl-Vorgang.
 *
 * Stattdessen bekommt jeder Mandant beim Anlegen einen englischen
 * 'adjective-noun'-Pseudonym im Stil von Docker-Containern und
 * GitHub-Repo-Vorschlaegen ('brave-eagle', 'quiet-otter'). Der Admin
 * kann ihn jederzeit neu generieren; alte Namen wandern in eine
 * History, damit per Zufall kein Wiedereintritt erfolgt und der
 * Admin spaeter rekonstruieren kann, unter welchem Pseudonym sein
 * Mandant frueher gelistet war.
 *
 * Kuratierung:
 *   - Adjektive: ausschliesslich positive / neutrale Eigenschaften.
 *     Kein 'dumb', 'evil', 'naked', keine politischen, religioesen,
 *     koerperlichen oder krankheits-bezogenen Begriffe.
 *   - Substantive: harmlose Tiere + Natur-/Geographie-Elemente.
 *     Keine Tiere, die als Schimpfwort verwendet werden ('pig',
 *     'donkey', 'snake', 'rat'). Keine Marken / Firmen. Kein
 *     religioeses / politisches Vokabular.
 *
 * Effektive Kombinationen: 60 × 60 = 3.600 (mehr als ausreichend
 * fuer realistische Self-Hoster-Szenarien). Bei Kollision haengen
 * wir eine Zahl an ('brave-eagle-42').
 */

import { randomInt } from 'crypto';

const ADJECTIVES = [
  'agile', 'amber', 'azure', 'bold', 'brave', 'bright', 'calm',
  'cheerful', 'clever', 'crimson', 'crystal', 'curious', 'daring',
  'eager', 'emerald', 'fair', 'fierce', 'fluffy', 'friendly',
  'gentle', 'golden', 'graceful', 'happy', 'hidden', 'humble',
  'jolly', 'keen', 'kind', 'lively', 'lucky', 'merry', 'mighty',
  'misty', 'neat', 'noble', 'peaceful', 'plucky', 'polite',
  'proud', 'quick', 'quiet', 'rapid', 'royal', 'rustic', 'shiny',
  'silent', 'silver', 'smart', 'sparkling', 'spirited', 'steady',
  'sturdy', 'sunny', 'swift', 'tender', 'tidy', 'tranquil',
  'valiant', 'velvet', 'witty',
];

const NOUNS = [
  'badger', 'beacon', 'beaver', 'birch', 'brook', 'canyon',
  'cedar', 'cliff', 'comet', 'compass', 'coral', 'crane',
  'creek', 'dolphin', 'eagle', 'falcon', 'fern', 'forest',
  'fox', 'galaxy', 'glacier', 'glade', 'grove', 'harbor',
  'harvest', 'hawk', 'hedgehog', 'heron', 'horizon', 'lantern',
  'lily', 'lotus', 'lynx', 'maple', 'meadow', 'mountain',
  'nebula', 'ocean', 'orbit', 'orchid', 'otter', 'panda',
  'pebble', 'pine', 'planet', 'puffin', 'quartz', 'rainbow',
  'raven', 'reef', 'river', 'robin', 'sparrow', 'spruce',
  'summit', 'thistle', 'valley', 'vista', 'willow', 'wren',
];

function pick(arr) {
  return arr[randomInt(0, arr.length)];
}

/**
 * Erzeugt einen neuen Pseudonym-Kandidaten. Vermeidet:
 *   - bereits global vergebene Pseudonyme (`taken`)
 *   - eigene History (`history`) — damit Re-Generate nicht zufaellig
 *     auf einen vorherigen Namen zurueckspringt
 *
 * Bei extrem unwahrscheinlicher Kollision (>200 Versuche) wird ein
 * numerischer Suffix angehaengt.
 */
export function generatePseudonym({ taken = [], history = [] } = {}) {
  const blocked = new Set([...taken, ...history]);
  for (let i = 0; i < 200; i++) {
    const candidate = `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
    if (!blocked.has(candidate)) return candidate;
  }
  // Pathologischer Fall — Universum offenbar gegen uns. Suffix.
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}-${randomInt(100, 10000)}`;
}

/** Validiert das Format eines manuell uebergebenen Pseudonyms.
 *  Wir lassen Eingaben nur in dem Format zu, das wir auch generieren —
 *  damit der Admin nicht versehentlich (wieder) seinen Klarnamen
 *  eintraegt und die Datenschutz-Schicht aushebelt. */
export function isValidPseudonym(s) {
  return typeof s === 'string'
    && /^[a-z]+-[a-z]+(-\d{1,4})?$/.test(s)
    && s.length <= 64;
}
