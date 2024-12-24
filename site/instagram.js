import fs from 'fs';
import path from 'path';
import { BaseGrab } from '../base/grab.js';
import { sleep } from '../base/utils.js';

export class InstagramGrab extends BaseGrab {
  constructor(o) {
    super(o);
    this.lastFetch = o.lastFetch ? new Date(o.lastFetch) : null;
    this.baseUrl = 'https://www.instagram.com/';
    this.id = o.id;
    this.maxItems = o.maxItems || Infinity;
    this.fetchedCount = 0;
  }

  async init() {
    const response = await this.fetch(`${this.baseUrl}${this.id}/`);
    const html = await response.text();
    
    const sharedDataMatch = html.match(/<script type="text\/javascript">window\._sharedData = (.+?);<\/script>/);
    if (sharedDataMatch) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const userId = sharedData.entry_data?.ProfilePage?.[0]?.graphql?.user?.id;
        if (userId) {
          this.userId = userId;
          console.log(`成功获取用户ID: ${this.userId}`);
          return this;
        }
      } catch (e) {
        // 静默失败，继续尝试其他方法
      }
    }

    const patterns = [
      /"user_id":"([0-9]+)"/,
      /"profilePage_([0-9]+)"/,
      /instagram\.com\/api\/v1\/users\/([0-9]+)\//,
      /"id":"([0-9]+)"/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        this.userId = match[1];
        console.log(`成功获取用户ID: ${this.userId}`);
        return this;
      }
    }

    // 保存调试文件但不输出路径
    const debugFile = path.join(this.path, 'debug.html');
    fs.writeFileSync(debugFile, html);
    
    throw new Error('获取用户ID失败');
  }

  async start() {
    const resultList = [];
    let nextData = null;

    do {
      const result = await this.getResultList(nextData);
      resultList.push(...result.resultList);
      this.fetchedCount += result.resultList.length;
      nextData = result.nextData;
      
      if (this.fetchedCount >= this.maxItems) {
        console.log(`已达到最大获取条数限制: ${this.maxItems}`);
        break;
      }
      
      if (nextData) {
        await sleep(1000);
      }
    } while (nextData);

    await this.download(resultList);
    return resultList;
  }

  async getResultList(nextData, tryCount = 0) {
    const remainingItems = this.maxItems - this.fetchedCount;
    const count = Math.min(50, remainingItems);

    if (count <= 0) {
      return {
        resultList: [],
        nextData: null
      };
    }

    const response = await this.fetch(
      `${this.baseUrl}api/v1/feed/user/${this.userId}/?count=${count}${nextData ? `&max_id=${nextData.next_max_id}` : ''}`,
      {
        headers: {
          'x-ig-app-id': '936619743392459'
        }
      }
    );

    const data = await response.json();

    if (data.items && Array.isArray(data.items)) {
      if (this.lastFetch) {
        const allOld = data.items.every(item => {
          const createTime = new Date(item.taken_at * 1000);
          return createTime <= this.lastFetch;
        });

        if (allOld) {
          return {
            resultList: [],
            nextData: null
          };
        }
      }

      return {
        resultList: this.eachItems(data.items),
        nextData: data.more_available ? {
          next_max_id: data.next_max_id
        } : null
      };
    }

    if (tryCount < 3) {
      await sleep(1000);
      return this.getResultList(nextData, tryCount + 1);
    }

    throw new Error('获取数据失败');
  }

  eachItems(items) {
    const resultList = [];

    for (const item of items) {
      try {
        const createTime = new Date(item.taken_at * 1000);

        if (this.lastFetch && createTime <= this.lastFetch) {
          continue;
        }

        if (item.carousel_media) {
          item.carousel_media.forEach(media => {
            try {
              resultList.push(this.formatMedia(media, item.taken_at));
            } catch (e) {
              console.error(`处理多媒体项目失败: ${item.id}`);
            }
          });
        } else {
          resultList.push(this.formatMedia(item, item.taken_at));
        }
      } catch (e) {
        console.error(`处理项目失败: ${item.id}`);
        continue;
      }
    }

    return resultList;
  }

  formatMedia(media, takenAt) {
    let createTime;
    try {
      const timestamp = parseInt(takenAt);
      if (isNaN(timestamp) || timestamp <= 0) {
        createTime = new Date().toISOString();
      } else {
        createTime = new Date(timestamp * 1000).toISOString();
      }
    } catch (e) {
      createTime = new Date().toISOString();
    }

    const isVideo = media.media_type === 2 || media.video_versions;
    return {
      id: media.id,
      createTime,
      type: isVideo ? 'video' : 'image',
      url: isVideo ? 
        (media.video_versions?.[0]?.url || media.video_url) : 
        (media.image_versions2?.candidates?.[0]?.url || media.display_url)
    };
  }
} 