import { describe, expect, it } from 'vitest';

import {
	captureJuliuDirectConnectionFromHref,
	mergeJuliuDirectConnectionSettings
} from './juliu-direct-connection';

describe('juliu direct connection bridge', () => {
	it('captures connection data from the URL hash and strips sensitive params', () => {
		const result = captureJuliuDirectConnectionFromHref(
			'https://hub.juliu.one/open-webui/#juliu_openai_url=https%3A%2F%2Fhub.juliu.one%2Fv1&juliu_openai_key=sk-test&keep=1'
		);

		expect(result.payload).toEqual({
			url: 'https://hub.juliu.one/v1',
			key: 'sk-test'
		});
		expect(result.cleanedUrl).toBe('/open-webui/#keep=1');
	});

	it('updates an existing direct connection instead of duplicating the URL', () => {
		const result = mergeJuliuDirectConnectionSettings(
			{
				directConnections: {
					OPENAI_API_BASE_URLS: ['https://hub.juliu.one/v1'],
					OPENAI_API_KEYS: ['sk-old'],
					OPENAI_API_CONFIGS: { '0': { enable: true } }
				}
			},
			{
				url: 'https://hub.juliu.one/v1/',
				key: 'sk-new'
			}
		);

		expect(result.changed).toBe(true);
		expect(result.settings.directConnections?.OPENAI_API_BASE_URLS).toEqual([
			'https://hub.juliu.one/v1'
		]);
		expect(result.settings.directConnections?.OPENAI_API_KEYS).toEqual(['sk-new']);
		expect(result.settings.directConnections?.OPENAI_API_CONFIGS).toEqual({
			'0': { enable: true }
		});
	});
});
