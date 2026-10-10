import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze, configureGeneration, recompileAnalysisResult, updateAnalysisShotDuration } from '../src/lib/promptEngine'
import { analyzeIntent, reviewShot } from '../src/lib/directorReview'

test('generation modes change executable prompt instructions and survive edits', () => {
  const base = analyze('一个女生在车里抬手擦窗。', 'idea', 'kling')
  const text = configureGeneration(base, 'Kling O-Series', 'text-to-video')
  assert.match(text.shots[0].videoPrompt, /文生视频/)
  assert.doesNotMatch(text.shots[0].videoPrompt, /首帧为唯一/)
  const edited = updateAnalysisShotDuration(text, 1, 7, 'kling')
  assert.equal(edited.outputModel, 'Kling O-Series')
  assert.equal(edited.generationMode, 'text-to-video')
  assert.equal(edited.totalDuration, 7)
  const switched = recompileAnalysisResult(text, 'vidu')
  assert.equal(switched.outputModel, 'Vidu Q3')
  assert.equal(switched.generationMode, 'text-to-video')
  assert.match(configureGeneration(base, undefined, 'image-to-video').shots[0].videoPrompt, /上传本镜首帧/)
})
test('review reports evidence for conflicting camera, dense actions and missing references', () => {
  const shot = analyze('固定机位，人物走进转身抬手拿起杯子，同时环绕推进拉远。', 'script', 'kling').shots[0]
  const findings = reviewShot(shot, 'reference-to-video').findings
  for (const code of ['运镜冲突', '动作密度', '多运镜', '缺少参考图']) assert.ok(findings.some(f => f.code === code && f.evidence && f.advice), code)
  assert.ok(reviewShot({ ...shot, referenceAssetIds: ['asset1'] }, 'reference-to-video').findings.every(f => f.code !== '缺少参考图'))
})
test('intent reflects actual storyboard fields', () => {
  const result = analyze('女孩坐在车里。', 'idea', 'kling')
  assert.ok(analyzeIntent(result)[0].values.includes(result.shots[0].subject))
  assert.ok(reviewShot({ ...result.shots[0], source: '她看向窗外', action: '她看向窗外', camera: '固定机位', dialogue: '' }).findings.length === 0)
})
