import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze, configureGeneration, reorderAnalysisShots, updateAnalysisShotDuration } from '../src/lib/promptEngine'
import { compileStudio, defaultBrief, defaultExecution, executionPack, initializeStudio, preparationFindings, remapResultAssets, restorePlanVersion, savePlanVersion } from '../src/lib/studio'
import { reviewShot } from '../src/lib/directorReview'
import { normalizeProject, createCharacter } from '../src/lib/projectStore'
import type { ProjectAsset } from '../src/lib/assetStore'

function plan() { return configureGeneration(initializeStudio(analyze('女生抬手擦窗。', 'script', 'kling'), { ...defaultBrief, subject: '女生', confirmed: true }, defaultExecution), 'Kling 3.0', 'text-to-video') }
test('edits preserve brief, shot state and execution across recompilation', () => {
  const result = plan(); result.shots[0].startState = '手放下'; result.shots[0].endState = '窗上出现透明区域'
  result.execution = { ...defaultExecution, entry: '实际入口', audio: 'post' }
  const edited = updateAnalysisShotDuration(result, 1, 6)
  assert.equal(edited.brief?.confirmed, true); assert.equal(edited.shots[0].startState, '手放下')
  assert.match(edited.shots[0].firstFramePrompt, /手放下/)
  assert.equal(normalizeProject({ result: edited }).brief?.subject, '女生')
})
test('subject stillness is not a fixed-camera conflict', () => {
  const shot = { ...plan().shots[0], source: '人物静止，镜头推进', camera: '缓慢推进' }
  assert.ok(reviewShot(shot).findings.every(f => f.code !== '运镜冲突'))
  assert.ok(reviewShot({ ...shot, source: '固定机位，镜头推进' }).findings.some(f => f.kind === '冲突'))
})
test('scope only selected entities and remove stale locks when unchecked', () => {
  const character = { ...createCharacter(), name: '甲', appearance: '蓝色外套' }
  const other = { ...createCharacter(), name: '乙', appearance: '红色衬衣' }
  const result = plan(); result.shots[0].entityIds = [character.id]
  const scoped = compileStudio(result, [character, other], [])
  assert.match(scoped.shots[0].videoPrompt, /蓝色外套/); assert.doesNotMatch(scoped.shots[0].videoPrompt, /红色衬衣/)
  scoped.shots[0].entityIds = []
  assert.doesNotMatch(compileStudio(scoped, [character, other], []).shots[0].videoPrompt, /蓝色外套/)
})
test('missing or incorrectly assigned frames are caught', () => {
  const result = configureGeneration(plan(), undefined, 'first-last-frame')
  assert.ok(preparationFindings(result.shots[0], result, []).some(f => f.evidence.includes('首尾帧')))
  const assets = ['a', 'b'].map(id => ({ id, name: id } as ProjectAsset))
  result.shots[0].referenceAssetIds = ['a', 'b']; result.shots[0].referenceRoles = { a: 'first-frame', b: 'last-frame' }
  assert.ok(preparationFindings(result.shots[0], result, assets).every(f => !f.evidence.includes('首尾帧')))
  result.shots[0].referenceRoles.b = 'first-frame'
  assert.ok(preparationFindings(result.shots[0], result, assets).some(f => f.kind === '冲突'))
})
test('audio stays out of video prompt in postproduction mode', () => {
  const result = plan(); result.shots[0].dialogue = '甲：你好'; result.shots[0].sound = '雨声'
  assert.doesNotMatch(configureGeneration(result).shots[0].videoPrompt, /甲：你好/)
  result.execution = { ...defaultExecution, audio: 'native' }
  assert.match(configureGeneration(result).shots[0].videoPrompt, /甲：你好/)
  assert.match(executionPack(result, []), /入口：待确认/)
})
test('version snapshots do not recurse and restore exact settings', () => {
  let result = savePlanVersion(plan(), '初版'); const id = result.versions![0].id
  result = updateAnalysisShotDuration(result, 1, 9)
  const restored = restorePlanVersion(result, id)
  assert.equal(restored.shots[0].duration, 3); assert.equal(restored.versions?.length, 1)
  for (let i = 0; i < 8; i++) result = savePlanVersion(result, String(i))
  assert.equal(result.versions?.length, 5); assert.ok(!('versions' in result.versions![0].snapshot))
})
test('import remaps role assignments in current plan and snapshots', () => {
  let result = plan(); result.shots[0].referenceAssetIds = ['old']; result.shots[0].referenceRoles = { old: 'identity' }
  result = savePlanVersion(result, '素材版')
  const imported = remapResultAssets(result, new Map([['old', 'new']]))
  assert.deepEqual(imported.shots[0].referenceRoles, { new: 'identity' })
  assert.deepEqual(imported.versions![0].snapshot.shots[0].referenceAssetIds, ['new'])
})
