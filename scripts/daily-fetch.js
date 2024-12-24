#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InstagramGrab } from '../site/instagram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '../config.json');

async function dailyFetch() {
  // 读取配置文件
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  for(const account of config.accounts) {
    try {
      console.log(`开始抓取账号: ${account.username}`);
      
      const inst = new InstagramGrab({
        id: account.username,
        lastFetch: account.lastFetch,
        path: process.cwd(),
        proxy: 'http://127.0.0.1:7890',
        maxItems: account.maxItems,
        timeout: config.timeout
      });

      await inst.init();
      await inst.start();
      
      // 更新最后抓取时间
      account.lastFetch = new Date().toISOString();
      
    } catch(err) {
      console.error(`抓取账号 ${account.username} 失败:`, err);
    }
  }

  // 保存更新后的配置
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

dailyFetch(); 