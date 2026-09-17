import type { Transition, Variants } from 'motion/react';

/** Memes courbes que les jetons CSS, pour que JS et CSS bougent a l'identique. */
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT_SOFT = [0.4, 0, 0.2, 1] as const;

export const transitions = {
  /** Deplacements et fondus courants. */
  soft: { duration: 0.32, ease: EASE_OUT_SOFT },
  /** Micro-interactions : survol, bascule, pastille active. */
  quick: { duration: 0.18, ease: EASE_OUT_SOFT },
  /** Elements qui prennent leur place, type feuille modale. */
  spring: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 },
} satisfies Record<string, Transition>;

/** Apparition standard d'un bloc de contenu. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Apparition en cascade d'une liste. Le delai est porte par le parent pour que
 * les enfants n'aient pas a connaitre leur propre index.
 */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
};
