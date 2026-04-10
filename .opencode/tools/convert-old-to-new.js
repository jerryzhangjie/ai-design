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

//初始x位置
const INIT_X = 100;
//初始y位置
const INIT_Y = 100;

//节点的x间隔
const NODE_X_DISTINCE = 150;
//节点的y间隔
const NODE_Y_DISTANCE = 100;
//节点宽度
const NODE_WIDTH = 300;
//节点中导航高度
const NODE_NAV_HEIGHT = 40;
//节点中头部高度(标题+描述)
const NODE_HEAD_HEIGHT = 162;

//流程间隔
const FLOW_DISTANCE = 200;

/**
 * 流程图数据结构转换
 * 兼容存量数据结构及新数据结构
 */
function convertFlowDataStruct(flowData) {
    let flowDataJsonO = typeof flowData === 'string' ? JSON.parse(flowData) : flowData;
    const containsed = flowDataJsonO.hasOwnProperty("lines");
    //新结构直接返回
    if (containsed) {
        return flowDataJsonO;
    }
    //老结构 先计算节点位置在转为新结构
    computeOldStrut(flowDataJsonO);
    return convert2NewStrut(flowDataJsonO);
}

/**
 * 计算节点位置(如果已经有节点位置则使用现有位置)，添加节点id，子节点排序，子节点添加父节点导航(如果已经有父节点导航则使用现有父节点导航)
 */
function computeOldStrut(parse) {
    const PAGES = {};
    const pages = parse.pages;
    for (let i = 0; i < pages.length; i++) {
        const pageObject = pages[i];
        const pageId = pageObject.pageId;
        PAGES[pageId] = pageObject;
    }
    //全局记录最大Y
    let maxY = INIT_Y;
    const workflows = parse.workflows;
    for (let i = 0; i < workflows.length; i++) {
        let trees = [];
        const workflow = workflows[i];
        //设置每个workflow的id
        workflow.workflowId = generateId();
        trees.push(workflow.workflowTree);
        //当前流程的x和y
        let flowX = INIT_X;
        let flowY = maxY;
        //当前流程的最大y
        let maxFlowY = maxY;
        while (trees.length > 0) {
            let subTrees = [];
            for (let j = 0; j < trees.length; j++) {
                //准备数据
                const tree = trees[j];
                const parentPageId = tree.pageId;
                const parentPage = PAGES[parentPageId];
                const navigationList = parentPage?.navigationList || [];
                const pageNav = {};
                const targetPageIds = [];
                if (navigationList.length > 0) {
                    for (let v = 0; v < navigationList.length; v++) {
                        const navInfo = navigationList[v];
                        const targetPageId = navInfo.targetPageId;
                        const navigationId = navInfo.navigationId;
                        pageNav[targetPageId] = navigationId;
                        targetPageIds.push(targetPageId);
                    }
                }
                //设置当前节点位置
                // if (!tree.hasOwnProperty("position")) {
                    const position = {};
                    position.x = flowX;
                    position.y = flowY;
                    tree.position = position;
                // }
                //计算下一个节点位置 162(标题+描述) + 导航数量*40 + 100(节点间隔)
                flowY = flowY + NODE_HEAD_HEIGHT + (navigationList.length === 0 ? 0 : navigationList.length) * NODE_NAV_HEIGHT + NODE_Y_DISTANCE;
                //设置nodeId
                tree.nodeId = generateId();

                //处理子节点
                const children = tree.children || [];
                if (children.length === 0) {
                    continue;
                }
                //给children排序，按其在父页面导航列表中的顺序排序
                children.sort((c1, c2) => {
                    const c1PageId = c1.pageId;
                    const c2PageId = c2.pageId;
                    const c1Index = targetPageIds.indexOf(c1PageId);
                    const c2Index = targetPageIds.indexOf(c2PageId);
                    //索引小的放在前面
                    return c1Index - c2Index;
                });
                //子节点设置父导航id
                for (let k = 0; k < children.length; k++) {
                    const child = children[k];
                    if (!child.hasOwnProperty("navigationId")) {
                        const pageId = child.pageId;
                        child.navigationId = pageNav[pageId];
                    }
                }
                subTrees = subTrees.concat(children);
            }
            //每个流程中的每一层结束重新计算下一层的初始xy
            maxFlowY = Math.max(flowY, maxFlowY);
            flowX = flowX + NODE_WIDTH + NODE_X_DISTINCE;
            flowY = maxY;
            trees = subTrees;
        }
        //每个workflow结束更新最大Y
        maxY = maxFlowY + FLOW_DISTANCE;
    }
    return parse;
}

/**
 * 统一计算后的老结构转换为新结构
 */
function convert2NewStrut(parse) {
    const oldWorkflows = parse.workflows;
    const newWorkflows = [];
    const lines = [];
    for (let i = 0; i < oldWorkflows.length; i++) {
        const oldWorkflow = oldWorkflows[i];
        const workflowId = oldWorkflow.workflowId;
        const newWorkflow = {};
        newWorkflow.workflowId = workflowId;
        const nodes = [];
        newWorkflow.nodes = nodes;
        newWorkflow.name = oldWorkflow.name;
        let trees = [];
        trees.push(oldWorkflow.workflowTree);
        while (trees.length > 0) {
            let subTrees = [];
            for (let j = 0; j < trees.length; j++) {
                const tree = trees[j];
                const node = {};
                node.pageId = tree.pageId;
                node.nodeId = tree.nodeId;
                node.position = tree.position;
                nodes.push(node);
                const children = tree.children || [];
                for (let k = 0; k < children.length; k++) {
                    const child = children[k];
                    const line = {};
                    // line.lineId = generateId();
                    // line.workflowId = workflowId;
                    line.sourcePageId = tree.pageId;
                    line.sourceNavigationId = child.navigationId;
                    line.sourceNodeId = tree.nodeId;
                    line.targetPageId = child.pageId;
                    line.targetNodeId = child.nodeId;
                    lines.push(line);
                }
                subTrees = subTrees.concat(children);
            }
            trees = subTrees;
        }
        newWorkflows.push(newWorkflow);
    }
    parse.workflows = newWorkflows;
    parse.lines = lines;
    return parse;
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
  var newData = convertFlowDataStruct(oldData);
  
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


if (require.main === module) {
  main();
}
