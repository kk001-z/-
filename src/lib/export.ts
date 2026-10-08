import type { AnalysisResult } from './promptEngine'

export function storyboardToMarkdown(result: AnalysisResult, platformName: string) {
  const lines: string[] = [
    `# ${result.title}`,
    '',
    result.summary,
    '',
    `- 平台：${platformName}`,
    `- 模型：${result.recommendedModel}`,
    `- 镜头：${result.shots.length}`,
    `- 总时长：约 ${result.totalDuration}s`,
    '',
  ]

  result.shots.forEach((shot) => {
    lines.push(
      `## Shot ${String(shot.id).padStart(2, '0')} · ${shot.title}`,
      '',
      `**原始意图**：${shot.source}`,
      '',
      `**时长**：${shot.duration}s`,
      '',
      `**景别 / 机位**：${shot.framing}`,
      '',
      `**运镜**：${shot.camera}`,
      '',
      `**情绪**：${shot.emotion}`,
      '',
      `**光线**：${shot.lighting}`,
      '',
      `**主体**：${shot.subject}`,
      '',
      `**动作**：${shot.action}`,
      '',
      `**环境**：${shot.environment}`,
      '',
      `**连续性锁定**：${shot.continuity}`,
      '',
    )

    if (shot.dialogue) lines.push(`**对白**：${shot.dialogue}`, '')
    if (shot.sound) lines.push(`**声音**：${shot.sound}`, '')

    lines.push(
      '### 首帧 / 文生图 Prompt',
      '',
      shot.firstFramePrompt,
      '',
      '### 图生视频 Prompt',
      '',
      shot.videoPrompt,
      '',
      '### 负面约束',
      '',
      shot.negativePrompt,
      '',
      '---',
      '',
    )
  })

  return lines.join('\n')
}

export function storyboardToPlainText(result: AnalysisResult, platformName: string) {
  return result.shots
    .map((shot) =>
      [
        `SHOT ${String(shot.id).padStart(2, '0')} · ${shot.title}`,
        `平台：${platformName} / ${result.recommendedModel}`,
        `时长：${shot.duration}s`,
        `首帧：${shot.firstFramePrompt}`,
        `视频：${shot.videoPrompt}`,
        `约束：${shot.negativePrompt}`,
      ].join('\n'),
    )
    .join('\n\n')
}

export function downloadTextFile(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function safeFilename(value: string) {
  const normalized = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)

  return normalized || 'framepilot-storyboard'
}


function csvCell(value: string | number | undefined) {
  const text = String(value ?? '').replace(/"/g, '""')
  return `"${text}"`
}

export function storyboardToCsv(result: AnalysisResult) {
  const headers = [
    'Shot',
    'Title',
    'Duration',
    'Framing',
    'Camera',
    'Emotion',
    'Subject',
    'Action',
    'Environment',
    'Lighting',
    'Continuity',
    'Dialogue',
    'Sound',
    'ReferenceAssets',
    'FirstFramePrompt',
    'VideoPrompt',
    'NegativePrompt',
  ]

  const rows = result.shots.map((shot) => [
    shot.id,
    shot.title,
    shot.duration,
    shot.framing,
    shot.camera,
    shot.emotion,
    shot.subject,
    shot.action,
    shot.environment,
    shot.lighting,
    shot.continuity,
    shot.dialogue,
    shot.sound,
    (shot.referenceAssetIds ?? []).join('|'),
    shot.firstFramePrompt,
    shot.videoPrompt,
    shot.negativePrompt,
  ])

  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map((value) => csvCell(value)).join(',')),
  ].join('\n')
}
