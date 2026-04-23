export const JULIU_DIRECT_CONNECTION_SESSION_KEY = 'juliu.pendingDirectConnection';

const URL_PARAM_KEYS = ['juliu_openai_url', 'ow-openai-url'];
const KEY_PARAM_KEYS = ['juliu_openai_key', 'ow-openai-key'];

export type JuliuDirectConnection = {
	url: string;
	key: string;
};

type DirectConnectionsConfig = {
	OPENAI_API_BASE_URLS?: string[];
	OPENAI_API_KEYS?: string[];
	OPENAI_API_CONFIGS?: Record<string, unknown>;
};

type SettingsLike = {
	directConnections?: DirectConnectionsConfig | null;
	[key: string]: unknown;
};

export const normalizeConnectionUrl = (value: string) => value.trim().replace(/\/+$/, '');

const readFirstParam = (params: URLSearchParams, keys: string[]) =>
	keys.map((key) => params.get(key)?.trim()).find((value) => value);

const clearKnownParams = (params: URLSearchParams) => {
	URL_PARAM_KEYS.forEach((key) => params.delete(key));
	KEY_PARAM_KEYS.forEach((key) => params.delete(key));
	return params;
};

const parseParams = (params: URLSearchParams): JuliuDirectConnection | null => {
	const url = readFirstParam(params, URL_PARAM_KEYS);
	const key = readFirstParam(params, KEY_PARAM_KEYS);

	if (!url || !key) {
		return null;
	}

	return {
		url: normalizeConnectionUrl(url),
		key
	};
};

export const captureJuliuDirectConnectionFromHref = (href: string) => {
	const url = new URL(href);
	const searchParams = new URLSearchParams(url.search);
	const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

	const payload = parseParams(hashParams) ?? parseParams(searchParams);

	clearKnownParams(searchParams);
	clearKnownParams(hashParams);

	const cleanedSearch = searchParams.toString();
	const cleanedHash = hashParams.toString();
	const cleanedUrl = `${url.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}${cleanedHash ? `#${cleanedHash}` : ''}`;

	return {
		payload,
		cleanedUrl
	};
};

export const storePendingJuliuDirectConnection = (
	storage: Pick<Storage, 'setItem'>,
	connection: JuliuDirectConnection
) => {
	storage.setItem(JULIU_DIRECT_CONNECTION_SESSION_KEY, JSON.stringify(connection));
};

export const getPendingJuliuDirectConnection = (
	storage: Pick<Storage, 'getItem'>
): JuliuDirectConnection | null => {
	try {
		const raw = storage.getItem(JULIU_DIRECT_CONNECTION_SESSION_KEY);
		if (!raw) {
			return null;
		}
		const parsed = JSON.parse(raw) as Partial<JuliuDirectConnection>;
		if (!parsed?.url || !parsed?.key) {
			return null;
		}
		return {
			url: normalizeConnectionUrl(parsed.url),
			key: parsed.key
		};
	} catch {
		return null;
	}
};

export const clearPendingJuliuDirectConnection = (storage: Pick<Storage, 'removeItem'>) => {
	storage.removeItem(JULIU_DIRECT_CONNECTION_SESSION_KEY);
};

export const mergeJuliuDirectConnectionSettings = (
	settings: SettingsLike | null | undefined,
	connection: JuliuDirectConnection
) => {
	const directConnections = settings?.directConnections ?? {};
	const urls = [...(directConnections.OPENAI_API_BASE_URLS ?? [])].map(normalizeConnectionUrl);
	const keys = [...(directConnections.OPENAI_API_KEYS ?? [])];
	const configs = { ...(directConnections.OPENAI_API_CONFIGS ?? {}) };

	const normalizedUrl = normalizeConnectionUrl(connection.url);
	const existingIndex = urls.findIndex((url) => url === normalizedUrl);

	let changed = false;

	if (existingIndex >= 0) {
		if (keys[existingIndex] !== connection.key) {
			keys[existingIndex] = connection.key;
			changed = true;
		}
	} else {
		urls.push(normalizedUrl);
		keys.push(connection.key);
		configs[(urls.length - 1).toString()] = configs[(urls.length - 1).toString()] ?? {};
		changed = true;
	}

	return {
		changed,
		settings: {
			...(settings ?? {}),
			directConnections: {
				OPENAI_API_BASE_URLS: urls,
				OPENAI_API_KEYS: keys,
				OPENAI_API_CONFIGS: configs
			}
		}
	};
};
