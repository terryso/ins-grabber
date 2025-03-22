import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class Request {
  constructor(o = {}) {
    this.proxy = o.proxy;
    this.cookie = o.cookie || process.env.INSTAGRAM_COOKIE;
    this.timeout = o.timeout || 30000;
    this.headers = {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'accept': 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
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
      'x-ig-app-id': '936619743392459',
      'x-requested-with': 'XMLHttpRequest'
    };

    if (!this.cookie) {
      throw new Error('Instagram cookie未设置，请在环境变量INSTAGRAM_COOKIE中设置有效的cookie');
    }
  }

  async fetch(url, options = {}) {
    const reqOptions = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
        cookie: this.cookie
      },
      timeout: this.timeout
    };

    if (this.proxy) {
      // console.log(`使用代理: ${this.proxy}`);
      reqOptions.agent = new HttpsProxyAgent(this.proxy);
    }

    try {
      const response = await fetch(url, reqOptions);
      if (!response.ok) {
        if (response.status === 401) {
          console.log(`cookie: ${this.cookie}`)
          throw new Error('Instagram认证失败，请检查cookie是否有效');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (error.type === 'request-timeout') {
        throw new Error(`请求超时 (${this.timeout}ms): ${url}`);
      }
      if (this.proxy && error.code === 'ECONNREFUSED') {
        throw new Error(`代理连接失败: ${this.proxy}`);
      }
      throw error;
    }
  }
}