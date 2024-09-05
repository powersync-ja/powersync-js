import { describe, expect, it } from 'vitest';
import { getUserAgentInfo } from '../src/db/sync/userAgent';

describe('userAgent', () => {
  it('should get browser info from userAgent', function () {
    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/YD2FSJ Safari/617.8'
      })
    ).toEqual(['Safari/16', 'ios']);
    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.99 Mobile Safari/537.36'
      })
    ).toEqual(['Chrome/128', 'android']);
    expect(
      getUserAgentInfo({
        userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'
      })
    ).toEqual(['Firefox/130', 'linux']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      })
    ).toEqual(['Chrome/128', 'linux']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 OPR/113.0.0.0'
      })
    ).toEqual(['Opera/113', 'linux']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0(iPad; U; CPU iPhone OS 3_2 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Version/4.0.4 Mobile/7B314 Safari/531.21.10'
      })
    ).toEqual(['Safari/4', 'ios']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.99 Mobile Safari/537.36 EdgA/127.0.2651.111'
      })
    ).toEqual(['Edge/127', 'android']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/128.2739.60 Mobile/15E148 Safari/605.1.15'
      })
    ).toEqual(['Edge/128', 'ios']);

    expect(
      getUserAgentInfo({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edge/44.18363.8131'
      })
    ).toEqual(['Edge/44', 'windows']);
  });

  it('should get browser info from userAgentData', function () {
    expect(
      getUserAgentInfo({
        userAgent: '',
        userAgentData: {
          platform: 'Android',
          brands: [
            {
              brand: 'Not)A;Brand',
              version: '99'
            },
            {
              brand: 'Opera',
              version: '113'
            },
            {
              brand: 'Chromium',
              version: '127'
            }
          ]
        }
      })
    ).toEqual(['Opera/113', 'android']);
  });
});
