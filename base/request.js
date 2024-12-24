import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class Request {
  constructor(o = {}) {
    this.proxy = o.proxy;
    this.cookie = o.cookie;
    this.headers = {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept': 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'x-requested-with': 'XMLHttpRequest',
      'x-instagram-ajax': '1',
      'referer': 'https://www.instagram.com/'
    };
  }

  async fetch(url, options = {}) {
    const reqOptions = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    };

    if (this.proxy) {
      reqOptions.agent = new HttpsProxyAgent(this.proxy);
    }

    if (this.cookie) {
      reqOptions.headers.cookie = this.cookie;
    }

    return fetch(url, reqOptions);
  }
} 