export const normalizeLogin = (value: string) => value.normalize("NFKC").trim().toLowerCase();
const loginPattern = new RegExp("^[\\p{L}\\p{N}][\\p{L}\\p{N} ._-]{1,39}$", "u");
export const validLogin = (value: string) => loginPattern.test(normalizeLogin(value));
