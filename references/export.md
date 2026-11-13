# 精确画幅与原件合成

使用技能自带的 Node.js 脚本，需要 sharp。Codex 桌面版可通过工作区依赖工具取得 Node 路径和包目录，将后者设为 `NODE_PATH`。以下命令中的脚本路径相对于技能目录，输入、输出和清单可使用绝对路径。

```sh
node scripts/finish-poster.cjs artwork.png poster.png --ratio 21:9
node scripts/finish-poster.cjs artwork.png branded.png --ratio 5:6 --layers layers.json
```

画幅可用预设比例，也可使用用户自定义的正整数宽高比，如 `--ratio 4:5`。脚本按图片的显示方向，在源图范围内取符合目标比例的最大整数像素画幅。默认居中裁切。主体靠边时用 `--position north`、`south`、`east` 或 `west` 选择保留的一侧。主体或文字无法一起保留时，重新布局或扩展底图，再进行导出。

图层清单是一个 JSON 数组，按从底到顶的顺序排列。坐标为裁切后画布上的左上角像素，素材相对路径以清单所在目录为准。

```json
[
  {"file": "logo.png", "x": 40, "y": 40, "width": 120},
  {"file": "copy.png", "x": 80, "y": 220},
  {"file": "qr.png", "x": 80, "y": 340}
]
```

省略 `width` 会保留素材原始像素；指定宽度会等比缩放。二维码优先按原始尺寸放置。图层应完整落在目标画布内。脚本只新建 PNG，输出已有同名文件时请选择新的文件名。导出后查看成图，核对文字与原件，尤其注意超宽幅的上下边缘。
