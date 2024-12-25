#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { InstagramGrab } from '../site/instagram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

program
  .name('ins-grab')
  .description('Instagram media downloader')
  .version(pkg.version);

program
  .command('download')
  .description('Download media from Instagram accounts')
  .option('-c, --config <path>', 'Path to config file', './config.json')
  .option('-u, --username <username>', 'Single account username')
  .option('-t, --types <types>', 'Media types to download (image,video)', 'image,video')
  .option('-m, --max-items <number>', 'Maximum items to download', '100')
  .option('-p, --proxy <url>', 'Proxy URL (optional)')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .action(async (options) => {
    try {
      if (options.username) {
        // 单账号下载模式
        const inst = new InstagramGrab({
          id: options.username,
          path: process.cwd(),
          proxy: options.proxy,
          timeout: parseInt(options.timeout),
          maxItems: parseInt(options.maxItems),
          mediaTypes: options.types.split(',')
        });

        await inst.init();
        await inst.start();
      } else {
        // 配置文件模式
        const configPath = path.resolve(options.config);
        if (!fs.existsSync(configPath)) {
          console.error(`配置文件不存在: ${configPath}`);
          process.exit(1);
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        for(const account of config.accounts) {
          try {
            console.log(`开始抓取账号: ${account.username}`);
            
            const inst = new InstagramGrab({
              id: account.username,
              lastFetch: account.lastFetch,
              path: process.cwd(),
              proxy: options.proxy,
              maxItems: account.maxItems,
              timeout: parseInt(options.timeout),
              mediaTypes: account.mediaTypes
            });

            await inst.init();
            await inst.start();
            
            account.lastFetch = new Date().toISOString();
          } catch(err) {
            console.error(`抓取账号 ${account.username} 失败:`, err);
          }
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error('执行失败:', error);
      process.exit(1);
    }
  });

program.parse(); 