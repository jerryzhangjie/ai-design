#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 内嵌 nanoid 核心逻辑（12位随机字符串）
const { webcrypto } = require('node:crypto');
const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;

function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}

function nanoid(size = 12) {
  fillPool(size);
  let id = '';
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id;
}

// 生成唯一 ID 的辅助函数
function generateId(prefix = 'id') {
  return `${prefix}_${nanoid()}`;
}

const DEFAULT_CONFIG = {
  input: '',
  output: '',
  dryRun: false
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      config.input = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      config.output = args[++i];
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    } else if (args[i] === '--help') {
      console.log(`
PRD 数据格式转换脚本
将旧数据格式转换为新的流程序列图就绪格式

用法: node convert-old-to-new.js [选项]

选项:
  --input <file>    输入文件路径 (默认: test-input.json)
  --output <file>   输出文件路径 (默认: PRD-TLBank-Converted.json)
  --dry-run         仅显示转换结果,不写入文件
  --help            显示帮助信息
`);
      process.exit(0);
    }
  }
  
  return config;
}

function normalizeNavigationList(navigationList) {
  navigationList = navigationList || [];
  return navigationList.map(function(nav) {
    return {
      navigationId: nav.navigationId,
      name: nav.name,
      targetPageId: nav.targetPageId,
      navigationType: nav.navigationType || '页面导航'
    };
  });
}

function convertPage(oldPage) {
  return {
    pageId: oldPage.pageId,
    name: oldPage.name,
    description: oldPage.description,
    navigationList: normalizeNavigationList(oldPage.navigationList)
  };
}

// 布局常量 (与 hzUx 项目保持一致)
const NODE_WIDTH = 300;        // 节点宽度300px
const NODE_X_DISTINCE = 150;   // 节点x间隔
const X_START = 100;           // 起始x坐标
const NODE_HEAD_HEIGHT = 162;  // 标题+描述高度162px
const NODE_NAV_HEIGHT = 40;    // 导航高度40px
const NODE_Y_DISTANCE = 100;   // 节点y间隔
const FLOW_DISTANCE = 200;     // 工作流间隔200px

/**
 * 计算节点总高度：标题+描述 + 导航
 * 与 hzUx 项目保持一致
 */
function calculateNodeHeight(pageId, allPages) {
  const page = allPages.find(p => p.pageId === pageId);
  const navCount = (page?.navigationList?.length || 0);
  return NODE_HEAD_HEIGHT + navCount * NODE_NAV_HEIGHT;
}

/**
 * 根据 workflowTree 计算节点位置（层级遍历算法）
 * 与 hzUx 项目保持一致：
 * 1. 单子节点：下一层，x+450，y继承父节点起始y
 * 2. 多子节点：同层并列，x不变，y递增
 * 3. 工作流之间：maxY + 200
 */
function calculateNodePosition(workflowTree, startX, startY, allPages) {
  const positionedNodes = [];
  let currentX = startX;
  let currentY = startY;
  let maxY = startY;
  let trees = [workflowTree];
  
  while (trees.length > 0) {
    let subTrees = [];
    
    // 处理当前层的所有节点
    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];
      const page = allPages.find(p => p.pageId === tree.pageId);
      const navCount = page?.navigationList?.length || 0;
      
      // 计算节点高度（与 hzUx 一致）
      const nodeHeight = NODE_HEAD_HEIGHT + navCount * NODE_NAV_HEIGHT;
      
      // 生成节点 ID
      const nodeId = generateId(`${tree.pageId}_node`);
      
      // 计算节点位置
      const node = {
        pageId: tree.pageId,
        nodeId: nodeId,
        navigationId: tree.navigationId,
        position: { x: currentX, y: currentY }
      };
      
      positionedNodes.push(node);
      
      // 更新 maxY
      maxY = Math.max(maxY, currentY + nodeHeight);
      
      // 收集子节点
      const children = tree.children || [];
      if (children.length > 0) {
        // 按导航顺序排序（与 hzUx 一致）
        const targetPageIds = (page?.navigationList || []).map(nav => nav.targetPageId);
        children.sort((c1, c2) => {
          return targetPageIds.indexOf(c1.pageId) - targetPageIds.indexOf(c2.pageId);
        });
        
        // 为每个子节点设置父导航 ID
        children.forEach(child => {
          const nav = page?.navigationList?.find(n => n.targetPageId === child.pageId);
          if (nav) child.navigationId = nav.navigationId;
        });
        
        subTrees = subTrees.concat(children);
      }
    }
    
    // 更新下一层起始位置（与 hzUx 一致）
    if (subTrees.length > 0) {
      currentX = currentX + NODE_WIDTH + NODE_X_DISTINCE;
      currentY = startY;  // 重置为该 workflow 的起始 Y
      maxY = Math.max(maxY, currentY + NODE_HEAD_HEIGHT); // 预留空间
    }
    
    trees = subTrees;
  }
  
  return { nodes: positionedNodes, maxY };
}

/**
 * 递归遍历计算后的节点树，提取节点和连线
 */
function traverseNodeTree(node, workflowId, nodes, lines) {
  // 添加当前节点
  nodes.push({
    nodeId: node.nodeId,
    pageId: node.pageId,
    position: { x: node.position.x, y: node.position.y }
  });
  
  // 处理子节点和连线
  if (node.childNodes && node.childNodes.length > 0) {
    node.childNodes.forEach((child, idx) => {
      // 添加连线（不包含 lineId，与正常例子保持一致）
      lines.push({
        workflowId,
        sourcePageId: node.pageId,
        sourceNavigationId: node.navigationId || '',
        sourceNodeId: node.nodeId,
        targetPageId: child.pageId,
        targetNodeId: child.nodeId
      });
      
      // 递归处理子节点
      traverseNodeTree(child, workflowId, nodes, lines);
    });
  }
}

/**
 * 从 workflowTree 提取节点和连线
 * 返回：{ workflows: [], lines: [] } 结构
 * @param {Array} workflows - 工作流数组
 * @param {Array} allPages - 所有页面
 */
function extractWorkflowsFromTree(workflows, allPages) {
  const workflowList = [];
  const totalLines = [];
  
  let currentY = 100; // 起始 y 坐标

  workflows.forEach((wf, wfIdx) => {
    if (!wf.workflowTree) return;

    const workflowId = generateId('workflow');
    const nodes = [];
    const lines = [];
    
    // 计算节点位置（层级遍历，与 hzUx 一致）
    const result = calculateNodePosition(
      wf.workflowTree,
      X_START,
      currentY,
      allPages
    );
    
    nodes.push(...result.nodes);
    
    // 计算当前 workflow 的最大 Y（与 hzUx 一致）
    let workflowMaxY = currentY;
    nodes.forEach(node => {
      const nodeHeight = calculateNodeHeight(node.pageId, allPages);
      const nodeMaxY = node.position.y + nodeHeight;
      if (nodeMaxY > workflowMaxY) {
        workflowMaxY = nodeMaxY;
      }
    });
    
    // 根据最大 y 坐标更新 currentY（与 hzUx 一致）
    currentY = workflowMaxY + FLOW_DISTANCE;

    // 生成流程名称
    let workflowName = `流程 ${wfIdx + 1}`;
    const uniquePages = [...new Set(nodes.map(n => n.pageId))];
    
    for (const pageId of uniquePages) {
      if (pageId !== 'homePage') {
        const page = allPages.find(p => p.pageId === pageId);
        if (page && page.name) {
          workflowName = `${page.name}流程`;
          break;
        }
      }
    }

    workflowList.push({
      workflowId,
      name: workflowName,
      nodes: nodes.map(n => ({
        nodeId: n.nodeId,
        pageId: n.pageId,
        position: {
          x: n.position.x,
          y: n.position.y
        }
      }))
    });

    // 生成连线
    nodes.forEach((node, idx) => {
      // 获取当前节点在 workflowTree 中的父节点的 children
      function findNodeChildren(tree, targetPageId) {
        if (tree.pageId === targetPageId) {
          return tree.children || [];
        }
        if (tree.children) {
          for (let child of tree.children) {
            const found = findNodeChildren(child, targetPageId);
            if (found) return found;
          }
        }
        return [];
      }
      
      // 获取当前节点在 workflowTree 中的子节点（从整个 workflowTree 开始查找）
      const allChildren = wf.workflowTree.children || [];
      const children = allChildren.filter(c => c.pageId === node.pageId);
      
      // 从 allChildren 中查找实际的子节点
      const actualChildren = [];
      function collectChildren(tree, parentId) {
        if (tree.pageId === parentId && tree.children) {
          actualChildren.push(...tree.children);
        }
        if (tree.children) {
          tree.children.forEach(child => collectChildren(child, parentId));
        }
      }
      collectChildren(wf.workflowTree, node.pageId);
      
      actualChildren.forEach(child => {
        const targetNode = nodes.find(n => n.pageId === child.pageId);
        if (targetNode) {
          lines.push({
            workflowId,
            sourcePageId: node.pageId,
            sourceNavigationId: child.navigationId || '',
            sourceNodeId: node.nodeId,
            targetPageId: child.pageId,
            targetNodeId: targetNode.nodeId
          });
        }
      });
    });
    
    totalLines.push(...lines);
  });

  return { workflows: workflowList, lines: totalLines };
}


function extractWorkflows(oldData) {
  // 优先处理 workflowTree 结构（新逻辑）
  const treeResult = extractWorkflowsFromTree(oldData.workflows || [], oldData.pages || []);
  if (treeResult.workflows && treeResult.workflows.length > 0) {
    return treeResult; // 返回 { workflows, lines }
  }

  // 兼容旧的扁平 nodes/edges 结构（降级）
  var workflows = [];
  var lines = [];
  
  if (Array.isArray(oldData.workflows)) {
    oldData.workflows.forEach(function(wf) {
      var wfNodes = [];
      var wfLines = [];
      
      if (Array.isArray(wf.nodes)) {
        wf.nodes.forEach(function(node) {
          wfNodes.push({
            nodeId: node.nodeId,
            pageId: node.pageId,
            position: node.position
          });
        });
      }
      
      if (Array.isArray(wf.edges)) {
        wf.edges.forEach(function(edge) {
          wfLines.push({
            sourcePageId: edge.sourcePageId,
            sourceNavigationId: edge.sourceNavigationId,
            sourceNodeId: edge.sourceNodeId,
            targetPageId: edge.targetPageId,
            targetNodeId: edge.targetNodeId
          });
        });
      }
      
      workflows.push({
        workflowId: wf.workflowId || generateId('workflow'),
        nodes: wfNodes
      });
      lines.push(...wfLines);
    });
  }
  
  return { workflows, lines };
}

function convertPRD(oldData) {
  var newPages = (oldData.pages || []).map(function(page) { return convertPage(page); });
  
  // 1. 优先从 workflowTree 提取（支持树结构）
  var extracted = extractWorkflows(oldData);
  var newWorkflows, newLines;
  
  // 处理新返回格式：{ workflows, lines }
  if (Array.isArray(extracted)) {
    // 旧格式（向后兼容）
    newWorkflows = extracted;
    newLines = [];
    newWorkflows.forEach(function(wf) {
      if (Array.isArray(wf.lines)) {
        newLines.push(...wf.lines);
      }
    });
  } else {
    // 新格式：{ workflows, lines }
    newWorkflows = extracted.workflows || [];
    newLines = extracted.lines || [];
  }
  
  // 2. 如果为空，回退到 pages 默认生成
  if (newWorkflows.length === 0) {
    console.warn('⚠️ 警告: 没有找到 workflowTree 或 nodes，自动生成默认流程');
    var defaultResult = generateDefaultWorkflow(newPages);
    if (Array.isArray(defaultResult)) {
      newWorkflows = defaultResult;
      newLines = [];
      newWorkflows.forEach(function(wf) {
        if (Array.isArray(wf.lines)) {
          newLines.push(...wf.lines);
        }
      });
    } else {
      newWorkflows = defaultResult.workflows || [];
      newLines = defaultResult.lines || [];
    }
  }

  return {
    projectName: oldData.projectName,
    description: oldData.description,
    pages: newPages,
    workflows: newWorkflows,
    lines: newLines,
    metadata: {
      originalFile: oldData.projectName + '.json',
      conversionDate: new Date().toISOString(),
      version: '2.2',
      format: 'flowchart-ready',
      notes: '自动转换自旧数据格式 (支持 workflowTree 树结构)'
    }
  };
}

function validatePRD(prd) {
  var errors = [];
  
  if (!Array.isArray(prd.pages)) {
    errors.push('缺失 pages 数组');
  } else {
    prd.pages.forEach(function(page, index) {
      if (!page.pageId) errors.push('pages[' + index + ']: 缺少 pageId');
      if (!page.name) errors.push('pages[' + index + ']: 缺少 name');
      if (!page.description) errors.push('pages[' + index + ']: 缺少 description');
      
      if (Array.isArray(page.navigationList)) {
        page.navigationList.forEach(function(nav, navIndex) {
          if (!nav.navigationId) errors.push('pages[' + index + '].navigationList[' + navIndex + ']: 缺少 navigationId');
          if (!nav.targetPageId) errors.push('pages[' + index + '].navigationList[' + navIndex + ']: 缺少 targetPageId');
          if (!nav.name) errors.push('pages[' + index + '].navigationList[' + navIndex + ']: 缺少 name');
        });
      }
    });
  }
  
  // 验证 workflows 和 lines 是同一层
  if (!Array.isArray(prd.workflows)) {
    errors.push('缺失 workflows 数组');
  } else {
    prd.workflows.forEach(function(wf, wfIndex) {
      if (!wf.workflowId) errors.push('workflows[' + wfIndex + ']: 缺少 workflowId');
      if (!Array.isArray(wf.nodes)) errors.push('workflows[' + wfIndex + ']: 缺少 nodes');
    });
  }
  
  if (!Array.isArray(prd.lines)) {
    errors.push('缺失 lines 数组');
  }
  
  return { valid: errors.length === 0, errors };
}

function main() {
  var config = parseArgs();
  
  console.log('PRD 数据格式转换器');
  console.log('====================');
  console.log('输入文件: ' + config.input);
  console.log('输出文件: ' + config.output);
  console.log('Dry Run: ' + config.dryRun);
  console.log();
  
  var inputPath = path.resolve(process.cwd(), config.input);
  if (!fs.existsSync(inputPath)) {
    console.error('输入文件不存在: ' + inputPath);
    process.exit(1);
  }
  
  var oldData;
  try {
    oldData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log('输入文件读取成功');
  } catch (err) {
    console.error('读取输入文件失败: ' + err.message);
    process.exit(1);
  }
  
  console.log('正在转换数据...');
  var newData = convertPRD(oldData);
  
  var validation = validatePRD(newData);
  if (!validation.valid) {
    console.warn('转换结果验证发现问题:');
    validation.errors.forEach(function(err) { console.warn('  - ' + err); });
  } else {
    console.log('数据格式验证通过');
  }
  
  var outputPath = path.resolve(process.cwd(), config.output);
  if (config.dryRun) {
    console.log('\n转换结果预览:');
    console.log(JSON.stringify(newData, null, 2));
  } else {
    try {
      fs.writeFileSync(outputPath, JSON.stringify(newData, null, 2));
      console.log('\n转换完成! 输出文件: ' + outputPath);
    } catch (err) {
      console.error('写入输出文件失败: ' + err.message);
      process.exit(1);
    }
  }
  
  console.log('\n转换完成!');
}

/**
 * 根据 pages 自动生成默认流程
 * 用于没有 workflowTree 或 workflows 为空的情况
 */
function generateDefaultWorkflow(pages) {
  const workflowList = [];
  const totalLines = [];
  
  // 遍历所有页面，为每个页面生成一个流程
  pages.forEach((page, idx) => {
    const workflowId = generateId('workflow');
    const nodes = [];
    const lines = [];
    
    // 计算节点位置 (与 hzUx 一致)
    const nodeX = X_START;
    const nodeY = 100 + idx * (NODE_HEAD_HEIGHT + NODE_Y_DISTANCE);  // 垂直排列
    
    // 添加当前页面节点
    const node = {
      nodeId: generateId(`${page.pageId}_node`),
      pageId: page.pageId,
      position: {
        x: nodeX,
        y: nodeY
      }
    };
    nodes.push(node);
    
    // 根据页面的 navigationList 生成连线
    if (Array.isArray(page.navigationList) && page.navigationList.length > 0) {
      page.navigationList.forEach((nav, navIdx) => {
        const targetPage = pages.find(p => p.pageId === nav.targetPageId);
        
        if (targetPage) {
          // 计算目标节点位置 (与 hzUx 一致)
          const targetX = X_START + NODE_WIDTH + NODE_X_DISTINCE;  // x = 100 + 300 + 150 = 550
          const targetY = 100 + idx * (NODE_HEAD_HEIGHT + NODE_Y_DISTANCE);
          
          // 为目标页面创建节点
          const targetNodeId = generateId(`${nav.targetPageId}_node`);
          const targetNode = {
            nodeId: targetNodeId,
            pageId: nav.targetPageId,
            position: {
              x: targetX,
              y: targetY
            }
          };
          nodes.push(targetNode);
          
          // 添加连线（不包含 lineId）
          lines.push({
            workflowId,
            sourcePageId: page.pageId,
            sourceNavigationId: nav.navigationId || 'goToDefault',
            sourceNodeId: node.nodeId,
            targetPageId: nav.targetPageId,
            targetNodeId: targetNodeId
          });
        }
      });
    }
    
    // 存储 workflow
    workflowList.push({
      workflowId,
      name: `${page.name}流程`,
      nodes: nodes.map(n => ({
        nodeId: n.nodeId,
        pageId: n.pageId,
        position: {
          x: n.position.x,
          y: n.position.y
        }
      }))
    });
    
    // 收集连线
    totalLines.push(...lines);
  });
  
  return { workflows: workflowList, lines: totalLines };
}

if (require.main === module) {
  main();
}
