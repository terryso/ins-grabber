import fs from 'fs';
import path from 'path';
import { Request } from './request.js';
import { sleep } from './utils.js';

export class BaseGrab extends Request {
  constructor(o) {
    super(o);
    this.id = o.id;
    this.path = o.path || process.cwd();
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

    for (const item of resultList) {
      const ext = item.type === 'video' ? '.mp4' : '.jpg';
      const filename = path.join(dir, `${item.id}${ext}`);

      if (!fs.existsSync(filename)) {
        console.log(`下载: ${filename}`);
        const response = await this.fetch(item.url);
        const buffer = await response.buffer();
        fs.writeFileSync(filename, buffer);
        await sleep(1000);
      }
    }
  }
} 