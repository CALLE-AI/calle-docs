export const REGIONS_SOURCE_URL: string;
export const REGIONS_README_URL: string;
export function extractRegions(readme: string): string;
export function fetchRegions(): Promise<string>;
