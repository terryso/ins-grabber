import fs from 'fs';
import path from 'path';
import { Request } from './request.js';
import { sleep } from './utils.js';

export class BaseGrab extends Request {
  constructor(o) {
    super(o);
    this.id = o.id;
    this.path = o.path || process.cwd();
    this.mediaTypes = new Set(o.mediaTypes || ['image', 'video']);
  }

  async start() {
    const resultList = [];
    let nextData = null;

    do {
      const result = await this.getResultList(nextData);
      resultList.push(...result.resultList);
      nextData = result.nextData;
      
      if (nextData) {
        await sleep(1000);
      }
    } while (nextData);

    await this.download(resultList);
    return resultList;
  }

  async download(resultList) {
    const dir = path.join(this.path, 'instagram', this.id);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const existingFiles = new Set(fs.readdirSync(dir));
    const downloadedIds = new Set();

    const filteredList = resultList.filter(item => this.mediaTypes.has(item.type));

    for (const item of filteredList) {
      try {
        const ext = item.type === 'video' ? '.mp4' : '.jpg';
        const createDate = new Date(item.createTime);
        const filename = `${createDate.getTime()}_${item.id}${ext}`;
        const filepath = path.join(dir, filename);

        const isDuplicate = Array.from(existingFiles).some(file => {
          const fileId = file.split('_')[1]?.split('.')[0];
          return fileId === item.id;
        });

        if (isDuplicate || downloadedIds.has(item.id)) {
          console.log(`跳过已下载的文件: ${item.id}`);
          continue;
        }

        console.log(`下载${item.type === 'video' ? '视频' : '图片'}: ${filename}`);
        const response = await this.fetch(item.url);
        const buffer = await response.buffer();
        fs.writeFileSync(filepath, buffer);
        downloadedIds.add(item.id);
        await sleep(1000);
      } catch (e) {
        console.error(`下载失败: ${item.id}`, e);
      }
    }
  }
} 