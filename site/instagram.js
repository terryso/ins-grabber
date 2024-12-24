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
        console.log('解析共享数据失败:', e);
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

    const debugFile = path.join(this.path, 'debug.html');
    fs.writeFileSync(debugFile, html);
    console.error(`页面内容已保存到: ${debugFile}`);
    
    throw new Error('获取用户ID失败');
  }

  async getResultList(nextData, tryCount = 0) {
    const variables = {
      id: this.userId,
      first: 50,
      after: nextData?.page_info?.end_cursor
    };

    const response = await this.fetch(
      `${this.baseUrl}graphql/query/?query_hash=e769aa130647d2354c40ea6a439bfc08&variables=${encodeURIComponent(
        JSON.stringify(variables)
      )}`
    );

    const data = await response.json();
    
    console.log('API响应数据:', JSON.stringify(data, null, 2));
    
    if(data.data?.user?.edge_owner_to_timeline_media) {
      const { edges, page_info } = data.data.user.edge_owner_to_timeline_media;
      
      if (edges.length > 0) {
        console.log('第一个节点数据:', JSON.stringify(edges[0].node, null, 2));
      }
      
      if(this.lastFetch) {
        const allOld = edges.every(edge => {
          const createTime = new Date(edge.node.taken_at_timestamp * 1000);
          return createTime <= this.lastFetch;
        });
        
        if(allOld) {
          return {
            resultList: [],
            nextData: null
          };
        }
      }

      return {
        resultList: this.eachEdges(edges),
        nextData: page_info.has_next_page ? {
          page_info
        } : null
      };
    }

    if (tryCount < 3) {
      await sleep(1000);
      return this.getResultList(nextData, tryCount + 1);
    }

    throw new Error('获取数据失败');
  }

  eachEdges(edges) {
    const resultList = [];
    
    for(const edge of edges) {
      try {
        const node = edge.node;
        const createTime = new Date(node.taken_at_timestamp * 1000);
        
        if(this.lastFetch && createTime <= this.lastFetch) {
          continue;
        }

        if (node.__typename === 'GraphSidecar') {
          node.edge_sidecar_to_children.edges.forEach(item => {
            try {
              resultList.push(this.formatNode(item.node));
            } catch (e) {
              console.error(`处理多图项目失败:`, e);
            }
          });
        } else {
          resultList.push(this.formatNode(node));
        }
      } catch (e) {
        console.error(`处理图片项目失败:`, e);
        continue;
      }
    }

    return resultList;
  }

  formatNode(node) {
    // 验证时间戳
    let createTime;
    try {
      const timestamp = parseInt(node.taken_at_timestamp);
      if (isNaN(timestamp) || timestamp <= 0) {
        console.warn(`无效的时间戳: ${node.taken_at_timestamp}, 使用当前时间`);
        createTime = new Date().toISOString();
      } else {
        createTime = new Date(timestamp * 1000).toISOString();
      }
    } catch (e) {
      console.warn(`时间戳处理错误: ${e.message}, 使用当前时间`);
      createTime = new Date().toISOString();
    }

    return {
      id: node.id,
      createTime,
      type: node.__typename === 'GraphVideo' ? 'video' : 'image',
      url: node.__typename === 'GraphVideo' ? node.video_url : node.display_url
    };
  }
} 