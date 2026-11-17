export const BACKEND_ID_PATTERN = /^[a-f0-9]{24}$/i;
export const isBackendId = (value: string) => BACKEND_ID_PATTERN.test(value);
