export const TIME_CATEGORY_PALETTE = [
  '#7c6ff7',
  '#e8c468',
  '#4fd1c5',
  '#f687b3',
  '#63b3ed',
  '#68d391',
  '#f6ad55',
  '#fc8181',
];

export function nextTimeCategoryColor(existingCount: number): string {
  return TIME_CATEGORY_PALETTE[existingCount % TIME_CATEGORY_PALETTE.length];
}
