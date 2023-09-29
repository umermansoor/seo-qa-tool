import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import axios from 'axios';
import { load, CheerioAPI } from 'cheerio';
import fs from 'fs';
import path from 'path';

// Parse arguments
const urlArg = process.argv.find(arg => arg.startsWith('--url='));

if (!urlArg) {
    throw new Error('No URL provided');
}

// URL from argument
const targetUrl = urlArg.replace('--url=', '');

describe(`SEO Tests for ${targetUrl}`, () => {
    let $: CheerioAPI;
    const extractedData: Record<string, string> = {};

    before('download and prepare', async () => {
        try {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                },
            });

            $ = load(response.data);
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                expect.fail(`Failed to fetch the URL. HTTP status code ${error.response?.status}`);
            } else {
                expect.fail(`Failed to fetch the URL.`);
            }
        }
    });

    it('should have a title', () => {
        const title = $('title').text();
        console.log('title', title);
        extractedData['title'] = title;
        expect(title).to.be.a('string').that.is.not.empty;
    });

    it('should have an h1 tag', () => {
        const h1 = $('h1').text();
        extractedData['h1'] = h1;
        expect(h1).to.be.a('string').that.is.not.empty;
    });

    it('should have a meta description', () => {
        const metaDescription = $('meta[name="description"]').attr('content');

        extractedData['meta.Description'] = metaDescription || 'Not Found';

        expect(metaDescription).to.be.a('string').that.is.not.empty;
    });

    it('should have a canonical URL pointing to itself', () => {
        const canonical = $('link[rel="canonical"]').attr('href');
        extractedData['canonical'] = canonical || 'Not Found';

        if (canonical) {
            expect(canonical).to.equal(targetUrl);
        } else {
            expect.fail('No canonical URL found');
        }
    });

    it('should not have noindex meta tag', () => {
        const noIndex = $('meta[name="robots"]').attr('content');
        extractedData['noIndex'] = noIndex || 'Not Found';
        expect(noIndex).to.not.equal('noindex');
    });

    // Print the extracted data in a table format at the end of the tests
    after('display extracted data', () => {
        if (extractedData.title) {
            // iterate over the extracted data and truncate values to 80 characters
            for (const key in extractedData) {
                if (Object.prototype.hasOwnProperty.call(extractedData, key)) {
                    const value = extractedData[key];
                    extractedData[key] = value.length > 80 ? value.substring(0, 80) + '...' : value;
                }
            }
            console.table(extractedData);
        }
    });
});
