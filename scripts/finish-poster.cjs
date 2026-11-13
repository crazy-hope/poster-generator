// Export a generated background at the requested display ratio, then place original assets.
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const sharp = require('sharp');

const positions = new Set(['centre', 'north', 'south', 'east', 'west']);

function parseRatio(input) {
  const match = /^\s*(\d+)\s*[:：]\s*(\d+)\s*$/.exec(input);
  if (!match) throw new Error('画幅请使用两个正整数，例如 4:5');
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('画幅的宽和高必须是正整数，且在安全整数范围内');
  }
  let a = width;
  let b = height;
  while (b !== 0) [a, b] = [b, a % b];
  return [width / a, height / a];
}

function cropOffset(spare, position, start, end) {
  if (position === start) return 0;
  if (position === end) return spare;
  return Math.floor(spare / 2);
}

async function readLayers(manifest, canvas) {
  const entries = JSON.parse(await fs.readFile(manifest, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('图层清单必须是 JSON 数组');
  const layers = [];
  for (const { file, x, y, width } of entries) {
    if (![x, y].every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error('图层坐标必须是非负整数');
    }
    const layer = sharp(path.resolve(path.dirname(manifest), file)).autoOrient();
    if (width !== undefined) {
      if (!Number.isSafeInteger(width) || width < 1 || width > canvas.width) {
        throw new Error('图层宽度超出允许范围：' + file);
      }
      layer.resize({ width });
    }
    const { data, info } = await layer.png().toBuffer({ resolveWithObject: true });
    if (x + info.width > canvas.width || y + info.height > canvas.height) {
      throw new Error('图层超出画布：' + file);
    }
    layers.push({ input: data, left: x, top: y });
  }
  return layers;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      ratio: { type: 'string' },
      position: { type: 'string', default: 'centre' },
      layers: { type: 'string' },
    },
  });
  const [input, output] = positionals;
  if (positionals.length !== 2 || !values.ratio || !positions.has(values.position)) {
    throw new Error('用法：node finish-poster.cjs 输入图 输出.png --ratio 宽:高 [--position centre|north|south|east|west] [--layers 清单.json]');
  }
  if (path.extname(output).toLowerCase() !== '.png') throw new Error('输出文件需要 .png 扩展名');
  const [unitWidth, unitHeight] = parseRatio(values.ratio);
  const source = sharp(input);
  const { autoOrient: size } = await source.metadata();
  const scale = Math.min(Math.floor(size.width / unitWidth), Math.floor(size.height / unitHeight));
  if (scale < 1) throw new Error('底图太小，无法裁出该画幅');
  const width = scale * unitWidth;
  const height = scale * unitHeight;
  const left = cropOffset(size.width - width, values.position, 'west', 'east');
  const top = cropOffset(size.height - height, values.position, 'north', 'south');
  const poster = source.autoOrient().extract({ left, top, width, height });
  if (values.layers) poster.composite(await readLayers(values.layers, { width, height }));

  // Publish only a finished file, without replacing a user's existing poster.
  const temp = await fs.mkdtemp(path.join(path.dirname(output), '.poster-'));
  try {
    const file = path.join(temp, 'poster.png');
    const info = await poster.png().toFile(file);
    if (info.width !== width || info.height !== height) throw new Error('导出尺寸与目标不符');
    await fs.link(file, output);
    console.log(output + '  ' + width + ' × ' + height);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
