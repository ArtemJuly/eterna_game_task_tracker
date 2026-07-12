import { characterStore } from './stores';
import type { Character } from '../types';

export function useCharacter(): Character {
  const [character] = characterStore.useStore();
  return character;
}
